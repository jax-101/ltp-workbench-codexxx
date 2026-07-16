let workspaceData = null;
let buildInfo = { version: "0.0.0", id: "loading", name: "Loading build" };
let selectedElementId = null;
let selectedElementType = "node";
let selectionRootIds = new Set();
let selectionIds = new Set();
let connectionSourceIds = new Set();
let multiSelectionMode = false;
let activeFrameId = null;
let mode = "navigation";
let connectionSourceId = null;
let hintsVisible = false;
let hintBuffer = "";
let hintEntries = [];
let searchText = "";
let statusText = "Loading prototype...";
let previewNodeId = null;
let viewportState = { left: 0, top: 0 };
let viewportSize = { width: 720, height: 560 };
let zoomLevel = 1;
let panelState = { leftOpen: true, rightOpen: true };
let deleteCandidateId = null;
let viewPersistTimer = null;
let editingRightPanelWasOpen = null;
let layoutAnimating = false;
let layoutAnimationFrameCount = 0;
let layoutAnimationMovedElements = 0;
let layoutAnimationConnectionsTracked = false;
let historyState = { canUndo: false, canRedo: false, undoLabel: null, redoLabel: null, undoCategory: null, redoCategory: null, revision: 0 };
let workspaceOperationQueue = Promise.resolve();
let visualTestState = {};

const app = document.querySelector("#app");
const hintAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".replace("H", "");
const commandBindings = window.LTP_COMMAND_BINDINGS || {};
const commandLabels = window.LTP_COMMAND_LABELS || {};
const diagramDefinitions = window.LTP_DIAGRAM_REGISTRY.DIAGRAM_DEFINITIONS;

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();
const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const tree = () => workspaceData?.trees?.[0];
const canvas = () => workspaceData?.canvases?.find((candidate) => candidate.id === tree()?.canvasId);
const rootFrameId = () => canvas()?.rootFrameId;
const system = () => workspaceData?.systems?.[0];
const nodeById = () => Object.fromEntries((tree()?.nodes || []).map((node) => [node.id, node]));
const frameById = () => Object.fromEntries((canvas()?.frames || []).map((frame) => [frame.id, frame]));
const linkById = () => Object.fromEntries((tree()?.links || []).map((link) => [link.id, link]));
const selectedNode = () => nodeById()[selectedElementId];
const selectedFrame = () => frameById()[selectedElementId];
const selectedLink = () => linkById()[selectedElementId];
const assumptionsForLink = (linkId) => (tree()?.assumptions || []).filter((assumption) => assumption.linkId === linkId);
const selectedSourceNodeIds = () => [...connectionSourceIds].filter((id) => Boolean(nodeById()[id]));
const diagramDefinition = () => diagramDefinitions[tree()?.type] || diagramDefinitions.goalTree;
const diagramNodeTypes = () => diagramDefinition()?.nodeTypes || [];

const elementType = (id) => {
  if (nodeById()[id]) return "node";
  if (frameById()[id]) return "frame";
  if (linkById()[id]) return "link";
  return "unknown";
};

const rebuildSelection = () => {
  const validRoots = [...selectionRootIds].filter((id) => elementType(id) !== "unknown");
  selectionRootIds = new Set(validRoots);
  selectionIds = new Set(window.LTP_SELECTION_MODEL.selectionClosure(tree(), validRoots, canvas()?.frames));
  if (selectedElementId && !selectionIds.has(selectedElementId)) {
    selectedElementId = validRoots.at(-1) || null;
  }
  selectedElementType = elementType(selectedElementId);
};

const replaceSelection = (id) => {
  selectedElementId = elementType(id) === "unknown" ? null : id;
  selectionRootIds = new Set(selectedElementId ? [selectedElementId] : []);
  rebuildSelection();
};

const toggleSelectionRoot = (id) => {
  if (selectionRootIds.has(id)) {
    selectionRootIds.delete(id);
    if (selectedElementId === id) selectedElementId = [...selectionRootIds].at(-1) || null;
  } else {
    selectionRootIds.add(id);
    selectedElementId = id;
  }
  rebuildSelection();
};

const layoutNode = (nodeId) =>
  tree()?.layout?.nodes?.[nodeId] || {
    x: 100,
    y: 100,
    width: 250,
    height: 72,
    pinned: false,
    layoutSource: "manual"
  };

const layoutFrame = (frameId) =>
  canvas()?.layout?.frames?.[frameId] || {
    x: 80,
    y: 80,
    width: 320,
    height: 180,
    pinned: false,
    layoutSource: "manual"
  };

const layoutLink = (linkId) => tree()?.layout?.links?.[linkId] || { labelPosition: { x: 0, y: 0 }, route: [], routeSource: "auto" };

const canvasSize = () => {
  const activeTree = tree();
  const activeCanvas = canvas();
  if (!activeTree || !activeCanvas) return { width: 1200, height: 800 };
  const nodeBoxes = Object.values(activeTree.layout?.nodes || {});
  const frameBoxes = Object.entries(activeCanvas.layout?.frames || {})
    .filter(([frameId]) => frameId !== activeCanvas.rootFrameId)
    .map(([, box]) => box);
  const boxes = [...nodeBoxes, ...frameBoxes];
  const width = Math.max(1200, ...boxes.map((box) => (box.x || 0) + (box.width || 0) + 140));
  const height = Math.max(760, ...boxes.map((box) => (box.y || 0) + (box.height || 0) + 140));
  return { width, height };
};

const setStatus = (message) => {
  statusText = message;
  const status = document.querySelector("[data-status]");
  if (status) status.textContent = message;
};

const enqueueWorkspaceOperation = (operation) => {
  const result = workspaceOperationQueue.then(operation);
  workspaceOperationQueue = result.catch(() => {});
  return result;
};

const captureViewport = () => {
  const shell = app.querySelector(".canvas-shell");
  if (!shell) return;
  viewportState = { left: shell.scrollLeft, top: shell.scrollTop };
  viewportSize = { width: shell.clientWidth, height: shell.clientHeight };
};

const updateViewState = () => {
  const activeCanvas = canvas();
  if (!activeCanvas) return;
  activeCanvas.viewState = {
    ...(activeCanvas.viewState || {}),
    activeFrameId,
    selectedElementId,
    selectionRootIds: [...selectionRootIds],
    mode,
    zoom: zoomLevel,
    pan: { x: viewportState.left, y: viewportState.top },
    panels: { ...panelState }
  };
};

const scheduleViewStatePersist = () => {
  if (layoutAnimating) return;
  window.clearTimeout(viewPersistTimer);
  viewPersistTimer = window.setTimeout(async () => {
    updateViewState();
    const activeCanvas = canvas();
    const canvasId = activeCanvas.id;
    const viewState = structuredClone(activeCanvas.viewState);
    await enqueueWorkspaceOperation(async () => {
      const result = await window.ltpPrototype.saveViewState(canvasId, viewState);
      workspaceData.revision = result.revision;
      workspaceData.updatedAt = result.workspace.updatedAt;
      historyState = result.history;
    });
  }, 300);
};

const restoreViewport = () => {
  const shell = app.querySelector(".canvas-shell");
  if (!shell) return;
  shell.scrollLeft = viewportState.left;
  shell.scrollTop = viewportState.top;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setViewportPosition = (left, top, options = {}) => {
  const shell = app.querySelector(".canvas-shell");
  if (!shell) return;
  shell.scrollLeft = clamp(left, 0, Math.max(0, shell.scrollWidth - shell.clientWidth));
  shell.scrollTop = clamp(top, 0, Math.max(0, shell.scrollHeight - shell.clientHeight));
  viewportState = { left: shell.scrollLeft, top: shell.scrollTop };
  updateViewState();
  updateMinimapViewport();
  if (options.persist !== false) scheduleViewStatePersist();
};

const panViewport = (dx, dy) => {
  captureViewport();
  setViewportPosition(viewportState.left + dx, viewportState.top + dy);
};

const setZoom = (nextZoom, options = {}) => {
  const shell = app.querySelector(".canvas-shell");
  if (!shell) return;
  captureViewport();
  const viewportCenter = {
    x: (viewportState.left + shell.clientWidth / 2) / zoomLevel,
    y: (viewportState.top + shell.clientHeight / 2) / zoomLevel
  };
  const logicalCenter = selectionCenter() || viewportCenter;
  zoomLevel = clamp(Math.round(nextZoom * 100) / 100, 0.35, 2.5);
  render();
  const nextShell = app.querySelector(".canvas-shell");
  const left = logicalCenter.x * zoomLevel - nextShell.clientWidth / 2;
  const top = logicalCenter.y * zoomLevel - nextShell.clientHeight / 2;
  setViewportPosition(left, top, { persist: options.persist });
  refreshHintsForViewport();
  setStatus(`Zoom ${Math.round(zoomLevel * 100)}%`);
};

const resetZoom = () => setZoom(1);

const fitView = () => {
  const shell = app.querySelector(".canvas-shell");
  if (!shell) return;
  const size = canvasSize();
  const fit = Math.min((shell.clientWidth - 40) / size.width, (shell.clientHeight - 64) / size.height, 1);
  zoomLevel = clamp(Math.round(fit * 100) / 100, 0.35, 1);
  viewportState = { left: 0, top: 0 };
  render();
  setViewportPosition(0, 0);
  refreshHintsForViewport();
  setStatus(`Diagram fitted at ${Math.round(zoomLevel * 100)}%`);
};

const centerSelection = () => {
  const point = selectionCenter();
  if (!point) {
    setStatus("Select an element to center it");
    return;
  }
  const shell = app.querySelector(".canvas-shell");
  setViewportPosition(point.x * zoomLevel - shell.clientWidth / 2, point.y * zoomLevel - shell.clientHeight / 2);
  setStatus("Selection centered");
};

const togglePanel = (side) => {
  if (side === "left") panelState.leftOpen = !panelState.leftOpen;
  if (side === "right") panelState.rightOpen = !panelState.rightOpen;
  render();
  scheduleViewStatePersist();
};

const beginInspectorEditing = () => {
  if (mode !== "editing") editingRightPanelWasOpen = panelState.rightOpen;
  panelState.rightOpen = true;
  mode = "editing";
};

const restoreInspectorAfterEditing = () => {
  if (editingRightPanelWasOpen !== null) panelState.rightOpen = editingRightPanelWasOpen;
  editingRightPanelWasOpen = null;
};

const focusCanvas = () => {
  app.querySelector(".canvas")?.focus();
};

const focusPrimaryEditor = () => {
  if (!selectedElementId || selectedElementType === "unknown") return;
  beginInspectorEditing();
  setStatus("Editing selected element");
  render();
  const editor = app.querySelector("[data-primary-editor]");
  editor?.focus();
  if (editor?.setSelectionRange && typeof editor.value === "string") {
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }
};

const persist = async (label = "Update workspace", category = "content") => {
  window.clearTimeout(viewPersistTimer);
  const pendingWorkspace = structuredClone(workspaceData);
  return enqueueWorkspaceOperation(async () => {
    try {
      pendingWorkspace.revision = workspaceData.revision || 0;
      pendingWorkspace.updatedAt = now();
      const activeTree = pendingWorkspace.trees?.[0];
      if (activeTree) activeTree.updatedAt = now();
      workspaceData = await window.ltpPrototype.saveWorkspace(pendingWorkspace, {
        recordHistory: true,
        includeViewState: false,
        label,
        category
      });
      historyState = await window.ltpPrototype.getHistoryState();
      setStatus("Saved locally");
    } catch (error) {
      console.error(`Persist failed during "${label}": ${error.message}`);
      throw error;
    }
  });
};

const executeDomainCommand = async (type, payload, label) => {
  window.clearTimeout(viewPersistTimer);
  return enqueueWorkspaceOperation(async () => {
    const result = await window.ltpPrototype.executeCommand({
      commandId: uid("command"),
      type,
      label,
      expectedRevision: workspaceData.revision || 0,
      payload
    });
    workspaceData = result.workspace;
    historyState = result.history;
    return result;
  });
};

const reconcileUiAfterHistory = () => {
  const activeTree = tree();
  if (!activeTree) return;
  if (!frameById()[activeFrameId]) activeFrameId = rootFrameId();
  if (selectedElementId && elementType(selectedElementId) === "unknown") selectedElementId = null;
  for (const id of [...connectionSourceIds]) {
    if (!nodeById()[id]) connectionSourceIds.delete(id);
  }
  rebuildSelection();
  previewNodeId = nodeById()[previewNodeId] ? previewNodeId : null;
  deleteCandidateId = null;
  mode = "navigation";
};

const moveHistory = async (direction) => {
  window.clearTimeout(viewPersistTimer);
  return enqueueWorkspaceOperation(async () => {
    const result = direction === "undo" ? await window.ltpPrototype.undo() : await window.ltpPrototype.redo();
    if (!result.changed) {
      setStatus(direction === "undo" ? "Nothing to undo" : "Nothing to redo");
      return;
    }
    if (result.category === "spatial.layout") {
      layoutAnimating = true;
      setStatus(`${direction === "undo" ? "Undoing" : "Redoing"} layout...`);
      try {
        await animateToLayout(result.workspace);
      } finally {
        layoutAnimating = false;
      }
    } else {
      workspaceData = result.workspace;
    }
    historyState = result.history;
    reconcileUiAfterHistory();
    setStatus(`${direction === "undo" ? "Undid" : "Redid"}: ${result.label}`);
    render();
    focusCanvas();
  });
};

const refreshMaps = () => {
  rebuildSelection();
  for (const id of [...connectionSourceIds]) {
    if (!nodeById()[id]) connectionSourceIds.delete(id);
  }
};

const selectElement = async (id, options = {}) => {
  const nextType = elementType(id);
  hintBuffer = "";

  if (mode === "frame-target") {
    if (nextType !== "frame" || !validFrameTargetIds().has(id)) {
      setStatus("Choose a valid destination frame");
      return;
    }
    await moveSelectionToFrame(id);
    return;
  }

  if (mode === "connection") {
    if (nextType !== "node") {
      hintsVisible = true;
      setStatus("Connection mode needs a node as the target");
      render();
      return;
    }

    const multiSources = selectedSourceNodeIds();
    const sourceIds = (multiSources.length ? multiSources : [connectionSourceId]).filter((sourceId) => sourceId && sourceId !== id);
    if (!sourceIds.length) {
      hintsVisible = true;
      setStatus("Choose a different node as the target");
      render();
      return;
    }

    await createLinksToTarget(sourceIds, id);
    replaceSelection(id);
    mode = "navigation";
    connectionSourceId = null;
    connectionSourceIds.clear();
    multiSelectionMode = false;
    hintsVisible = false;
    setStatus(`${sourceIds.length} source link${sourceIds.length === 1 ? "" : "s"} ready for this target`);
    render();
    return;
  }

  if (multiSelectionMode) {
    if (nextType === "frame") activeFrameId = id;
    toggleSelectionRoot(id);
    hintsVisible = true;
    hintEntries = visibleHintEntries();
    setStatus(`${selectionRootIds.size} element${selectionRootIds.size === 1 ? "" : "s"} selected. Press L to connect selected nodes.`);
    render();
    return;
  }

  if (
    nextType === "frame" &&
    !options.additive &&
    selectionRootIds.size === 1 &&
    selectionRootIds.has(id)
  ) {
    activeFrameId = id;
    replaceSelection(null);
    hintsVisible = false;
    setStatus(`Selection cleared; creation frame remains ${frameById()[id].name}`);
    render();
    return;
  }

  if (nextType === "frame") activeFrameId = id;
  if (options.additive) toggleSelectionRoot(id);
  else replaceSelection(id);
  if (nextType === "frame" && !options.additive) {
    const selectedNodes = [...selectionIds].filter((selectedId) => elementType(selectedId) === "node").length;
    const internalLinks = [...selectionIds].filter((selectedId) => elementType(selectedId) === "link").length;
    setStatus(`Frame selected: ${selectedNodes} node${selectedNodes === 1 ? "" : "s"}, ${internalLinks} internal link${internalLinks === 1 ? "" : "s"}`);
  } else if (options.additive) {
    setStatus(`${selectionRootIds.size} explicit elements selected; ${selectionIds.size} total with internal links`);
  }
  hintsVisible = false;
  render();
};

const hintAlphabetForMode = () =>
  multiSelectionMode && mode !== "connection" ? hintAlphabet.replace("L", "").replace("M", "") : hintAlphabet;

const generateHintLabels = (count, alphabet = hintAlphabetForMode()) => {
  const labels = [...alphabet];
  while (labels.length < count) {
    const prefix = labels.shift();
    labels.unshift(...[...alphabet].map((letter) => `${prefix}${letter}`));
  }
  return labels.slice(0, count);
};

const logicalViewport = () => ({
  left: viewportState.left / zoomLevel,
  top: viewportState.top / zoomLevel,
  right: (viewportState.left + viewportSize.width) / zoomLevel,
  bottom: (viewportState.top + viewportSize.height) / zoomLevel
});

const boxIntersectsViewport = (box, viewport) =>
  box.x + box.width >= viewport.left &&
  box.x <= viewport.right &&
  box.y + box.height >= viewport.top &&
  box.y <= viewport.bottom;

const visibleHintEntries = () => {
  const activeTree = tree();
  if (!activeTree) return [];
  const query = searchText.trim().toLowerCase();
  const viewport = logicalViewport();
  const entries = [];

  if (mode === "frame-target") {
    const validTargets = validFrameTargetIds();
    if (validTargets.has(rootFrameId())) {
      entries.push({
        id: rootFrameId(),
        type: "frame",
        x: viewport.left + 18,
        y: viewport.top + 24,
        label: "ROOT"
      });
    }
    for (const frame of canvas().frames.filter((candidate) => candidate.id !== rootFrameId() && validTargets.has(candidate.id))) {
      const box = layoutFrame(frame.id);
      if (!boxIntersectsViewport(box, viewport)) continue;
      entries.push({
        id: frame.id,
        type: "frame",
        x: clamp(box.x + 16, viewport.left + 12, viewport.right - 34),
        y: clamp(box.y + 16, viewport.top + 12, viewport.bottom - 28),
        label: frame.name
      });
    }
    const labels = generateHintLabels(entries.length);
    return entries.map((entry, index) => ({ ...entry, hint: labels[index] }));
  }

  for (const frame of canvas().frames.filter((candidate) => candidate.id !== rootFrameId())) {
    const box = layoutFrame(frame.id);
    if (boxIntersectsViewport(box, viewport) && (!query || frame.name.toLowerCase().includes(query))) {
      entries.push({
        id: frame.id,
        type: "frame",
        x: clamp(box.x + 16, viewport.left + 12, viewport.right - 34),
        y: clamp(box.y + 16, viewport.top + 12, viewport.bottom - 28),
        label: frame.name
      });
    }
  }

  for (const node of activeTree.nodes) {
    const box = layoutNode(node.id);
    const text = `${node.shortLabel || ""} ${node.statement || ""}`.toLowerCase();
    if (boxIntersectsViewport(box, viewport) && (!query || text.includes(query))) {
      entries.push({
        id: node.id,
        type: "node",
        x: clamp(box.x + box.width - 18, viewport.left + 12, viewport.right - 34),
        y: clamp(box.y - 10, viewport.top + 12, viewport.bottom - 28),
        label: node.shortLabel || node.statement
      });
    }
  }

  for (const link of activeTree.links) {
    const box = layoutLink(link.id).labelPosition || { x: 0, y: 0 };
    const text = `${link.meaning || ""} ${link.verbalization || ""}`.toLowerCase();
    const labelIsVisible =
      box.x >= viewport.left && box.x <= viewport.right && box.y >= viewport.top && box.y <= viewport.bottom;
    if (labelIsVisible && (!query || text.includes(query))) {
      entries.push({
        id: link.id,
        type: "link",
        x: clamp(box.x + 18, viewport.left + 12, viewport.right - 34),
        y: clamp(box.y - 12, viewport.top + 12, viewport.bottom - 28),
        label: link.meaning || link.id
      });
    }
  }

  const modeFilteredEntries = mode === "connection" ? entries.filter((entry) => entry.type === "node") : entries;
  const labels = generateHintLabels(modeFilteredEntries.length);
  return modeFilteredEntries.map((entry, index) => ({ ...entry, hint: labels[index] }));
};

const showHints = () => {
  hintsVisible = true;
  hintBuffer = "";
  captureViewport();
  hintEntries = visibleHintEntries();
  setStatus(`Hints active: ${hintEntries.length} selectable elements`);
  render();
};

const refreshHintsForViewport = () => {
  if (!hintsVisible) return;
  captureViewport();
  hintBuffer = "";
  hintEntries = visibleHintEntries();
  render();
};

const hideHints = () => {
  hintsVisible = false;
  hintBuffer = "";
  render();
};

const toggleHints = () => {
  if (hintsVisible) {
    hintsVisible = false;
    hintBuffer = "";
    setStatus("Hints hidden");
    render();
    return;
  }
  showHints();
};

const handleHintKey = (key) => {
  hintBuffer += key.toUpperCase();
  const exact = hintEntries.find((entry) => entry.hint === hintBuffer);
  const hasPrefix = hintEntries.some((entry) => entry.hint.startsWith(hintBuffer));

  if (exact) {
    selectElement(exact.id);
    return;
  }

  if (!hasPrefix) {
    hintBuffer = "";
    setStatus("No hint matches that sequence");
  }
  render();
};

const updateNode = async (id, field, value) => {
  await executeDomainCommand(
    "node.update",
    { treeId: tree().id, nodeId: id, field, value },
    `Edit ${nodeTypeLabel(nodeById()[id]?.type || "node")}`
  );
  render();
};

const updateFrame = async (id, field, value) => {
  const frame = frameById()[id];
  frame[field] = value;
  frame.updatedAt = now();
  render();
  await persist("Edit frame");
};

const updateLink = async (id, field, value) => {
  const link = linkById()[id];
  link[field] = value;
  link.updatedAt = now();
  render();
  await persist("Edit link");
};

const updateAssumption = async (id, value) => {
  const assumption = tree().assumptions.find((item) => item.id === id);
  assumption.statement = value;
  assumption.updatedAt = now();
  render();
  await persist("Edit assumption");
};

const viewportNodePosition = (frame, width = 250, height = 72) => {
  captureViewport();
  const shell = app.querySelector(".canvas-shell");
  const viewport = {
    left: viewportState.left / zoomLevel,
    top: viewportState.top / zoomLevel,
    right: (viewportState.left + (shell?.clientWidth || 720)) / zoomLevel,
    bottom: (viewportState.top + (shell?.clientHeight || 560)) / zoomLevel
  };
  const isRootFrame = frame.id === rootFrameId();
  const frameBox = layoutFrame(frame.id);
  const frameInner = isRootFrame
    ? viewport
    : {
        left: frameBox.x + 28,
        top: frameBox.y + 54,
        right: frameBox.x + frameBox.width - 28,
        bottom: frameBox.y + frameBox.height - 28
      };
  const intersection = {
    left: Math.max(viewport.left + 42, frameInner.left),
    top: Math.max(viewport.top + 52, frameInner.top),
    right: Math.min(viewport.right - 42, frameInner.right),
    bottom: Math.min(viewport.bottom - 42, frameInner.bottom)
  };
  const fitsActiveFrame = intersection.right - intersection.left >= width && intersection.bottom - intersection.top >= height;
  const base = fitsActiveFrame
    ? { x: intersection.left, y: intersection.top }
    : { x: viewport.left + 42, y: viewport.top + 52 };
  const existingBoxes = Object.values(tree()?.layout?.nodes || {});

  for (let index = 0; index < 24; index += 1) {
    const candidate = {
      x: Math.round(base.x + (index % 6) * 18),
      y: Math.round(base.y + Math.floor(index / 6) * 18),
      width,
      height
    };
    const positionOccupied = existingBoxes.some(
      (box) => Math.abs(candidate.x - box.x) < 12 && Math.abs(candidate.y - box.y) < 12
    );
    if (!positionOccupied) return candidate;
  }

  return { x: Math.round(base.x), y: Math.round(base.y), width, height };
};

const createNode = async (
  frameId = activeFrameId,
  type = "necessaryCondition",
  statement = "New necessary condition",
  options = {}
) => {
  const activeTree = tree();
  const id = uid("node");
  const frame = frameById()[frameId] || frameById()[rootFrameId()];
  const frameBox = layoutFrame(frame.id);
  const offset = frame.nodeIds.length * 18;
  const position =
    options.placement === "viewport"
      ? viewportNodePosition(frame)
      : { x: frameBox.x + 48 + offset, y: frameBox.y + 80 + offset, width: 250, height: 72 };
  const node = {
    id,
    treeId: activeTree.id,
    frameId: frame.id,
    type,
    statement,
    shortLabel: statement,
    status: "draft",
    tags: [type],
    sourceIds: [],
    validation: {
      clarity: "unknown",
      entityExistence: "unknown",
      singleIdea: "unknown",
      completeSentence: "unknown",
      confidence: "unknown",
      notes: ""
    },
    promotedFrom: null,
    createdAt: now(),
    updatedAt: now()
  };

  activeTree.nodes.push(node);
  frame.nodeIds.push(id);
  activeTree.layout.nodes[id] = {
    ...position,
    pinned: false,
    layoutSource: "manual"
  };
  replaceSelection(id);
  connectionSourceIds.clear();
  multiSelectionMode = false;
  await persist("Create node");
  render();
  return id;
};

const createNodeInViewport = () =>
  createNode(
    activeFrameId,
    diagramDefinition()?.defaultNodeType || "necessaryCondition",
    "New necessary condition",
    { placement: "viewport" }
  );

const createSupportingNode = async () => {
  const target = selectedNode();
  if (!target) {
    await createNode();
    return;
  }

  const type = target.type === "goal" ? "criticalSuccessFactor" : "necessaryCondition";
  const sourceId = await createNode(target.frameId, type, type === "criticalSuccessFactor" ? "New critical success factor" : "New necessary condition");
  await createLink(sourceId, target.id);
  return sourceId;
};

const createFrame = async () => {
  const activeTree = tree();
  const activeCanvas = canvas();
  const parent = frameById()[activeFrameId] || frameById()[rootFrameId()];
  const parentBox = layoutFrame(parent.id);
  captureViewport();
  const rootPosition = {
    x: Math.round(viewportState.left / zoomLevel + 42),
    y: Math.round(viewportState.top / zoomLevel + 72)
  };
  const id = uid("frame");
  const frame = {
    id,
    canvasId: activeCanvas.id,
    treeId: parent.treeId || null,
    kind: "container",
    parentFrameId: parent.id,
    name: "New frame",
    semanticType: null,
    collapsed: false,
    childFrameIds: [],
    nodeIds: [],
    notes: "",
    createdAt: now(),
    updatedAt: now()
  };
  activeCanvas.frames.push(frame);
  parent.childFrameIds.push(id);
  activeCanvas.layout.frames[id] = {
    x: parent.id === rootFrameId() ? rootPosition.x : parentBox.x + 42,
    y: parent.id === rootFrameId() ? rootPosition.y : parentBox.y + 72,
    width: 320,
    height: 190,
    pinned: false,
    layoutSource: "manual"
  };
  activeFrameId = id;
  replaceSelection(id);
  connectionSourceIds.clear();
  multiSelectionMode = false;
  await persist("Create frame");
  render();
};

const frameDepth = (frameId) => {
  const frames = frameById();
  let depth = 0;
  let frame = frames[frameId];
  while (frame?.parentFrameId) {
    depth += 1;
    frame = frames[frame.parentFrameId];
  }
  return depth;
};

const frameDescendantIds = (frameId, includeSelf = false) => {
  const descendants = new Set(includeSelf ? [frameId] : []);
  const collect = (id) => {
    for (const childId of frameById()[id]?.childFrameIds || []) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      collect(childId);
    }
  };
  collect(frameId);
  return descendants;
};

const selectedMovableRoots = () => {
  const explicitFrameIds = new Set(
    [...selectionRootIds].filter((id) => Boolean(frameById()[id]) && id !== rootFrameId())
  );
  const topFrameIds = [...explicitFrameIds].filter((frameId) => {
    let parentId = frameById()[frameId]?.parentFrameId;
    while (parentId) {
      if (explicitFrameIds.has(parentId)) return false;
      parentId = frameById()[parentId]?.parentFrameId;
    }
    return true;
  });
  const selectedFrameClosure = new Set(topFrameIds.flatMap((frameId) => [...frameDescendantIds(frameId, true)]));
  const nodeIds = [...selectionRootIds].filter((id) => {
    const node = nodeById()[id];
    return Boolean(node) && !selectedFrameClosure.has(node.frameId);
  });
  return [
    ...topFrameIds.map((id) => ({ id, type: "frame" })),
    ...nodeIds.map((id) => ({ id, type: "node" }))
  ];
};

const validFrameTargetIds = () => {
  const invalid = new Set();
  for (const root of selectedMovableRoots()) {
    if (root.type !== "frame") continue;
    for (const frameId of frameDescendantIds(root.id, true)) invalid.add(frameId);
  }
  return new Set(canvas().frames.filter((frame) => !invalid.has(frame.id)).map((frame) => frame.id));
};

const applyFrameMoves = async (moves, label) => {
  const effectiveMoves = moves.filter(({ id, type, targetFrameId }) => {
    if (!frameById()[targetFrameId]) return false;
    if (type === "node") return nodeById()[id]?.frameId !== targetFrameId;
    return frameById()[id]?.parentFrameId !== targetFrameId && !frameDescendantIds(id, true).has(targetFrameId);
  });
  if (!effectiveMoves.length) {
    mode = "navigation";
    hintsVisible = false;
    setStatus("Selection is already at that frame level");
    render();
    return false;
  }

  for (const move of effectiveMoves.filter((candidate) => candidate.type === "frame")) {
    const frame = frameById()[move.id];
    const previousParent = frameById()[frame.parentFrameId];
    const targetFrame = frameById()[move.targetFrameId];
    if (previousParent) previousParent.childFrameIds = previousParent.childFrameIds.filter((id) => id !== frame.id);
    if (!targetFrame.childFrameIds.includes(frame.id)) targetFrame.childFrameIds.push(frame.id);
    frame.parentFrameId = targetFrame.id;
    frame.updatedAt = now();
  }

  for (const move of effectiveMoves.filter((candidate) => candidate.type === "node")) {
    const node = nodeById()[move.id];
    const targetFrame = frameById()[move.targetFrameId];
    for (const frame of canvas().frames) frame.nodeIds = frame.nodeIds.filter((id) => id !== node.id);
    if (!targetFrame.nodeIds.includes(node.id)) targetFrame.nodeIds.push(node.id);
    node.frameId = targetFrame.id;
    node.updatedAt = now();
  }

  mode = "navigation";
  hintsVisible = false;
  multiSelectionMode = false;
  await persist(label);
  rebuildSelection();
  setStatus(`${effectiveMoves.length} selected root${effectiveMoves.length === 1 ? "" : "s"} moved`);
  render();
  focusCanvas();
  return true;
};

const moveSelectionToParent = async () => {
  const moves = selectedMovableRoots()
    .map((root) => {
      if (root.type === "node") {
        const currentFrame = frameById()[nodeById()[root.id]?.frameId];
        return currentFrame?.parentFrameId ? { ...root, targetFrameId: currentFrame.parentFrameId } : null;
      }
      const currentParent = frameById()[frameById()[root.id]?.parentFrameId];
      return currentParent?.parentFrameId ? { ...root, targetFrameId: currentParent.parentFrameId } : null;
    })
    .filter(Boolean);
  if (!moves.length) {
    setStatus("The selected roots cannot move any higher");
    return;
  }
  await applyFrameMoves(moves, "Move selection to parent frame");
};

const moveSelectionToFrame = async (targetFrameId) => {
  if (!validFrameTargetIds().has(targetFrameId)) {
    setStatus("That frame cannot contain the current selection");
    return;
  }
  const roots = selectedMovableRoots();
  await applyFrameMoves(
    roots.map((root) => ({ ...root, targetFrameId })),
    "Move selection to frame"
  );
  activeFrameId = targetFrameId;
  updateViewState();
};

const frameAtPoint = (point) => {
  const candidates = canvas().frames.filter((frame) => {
    if (frame.id === rootFrameId()) return false;
    const box = layoutFrame(frame.id);
    return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
  });
  candidates.sort((left, right) => {
    const depthDifference = frameDepth(right.id) - frameDepth(left.id);
    if (depthDifference) return depthDifference;
    const leftBox = layoutFrame(left.id);
    const rightBox = layoutFrame(right.id);
    return leftBox.width * leftBox.height - rightBox.width * rightBox.height;
  });
  return candidates[0] || frameById()[rootFrameId()];
};

const boundsForBoxes = (boxes) => {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const boxesOverlapWithGap = (left, right, gap = 0) =>
  left.x < right.x + right.width + gap &&
  left.x + left.width + gap > right.x &&
  left.y < right.y + right.height + gap &&
  left.y + left.height + gap > right.y;

const shiftFrameSubtree = (frameId, dx, dy) => {
  const frame = frameById()[frameId];
  if (!frame || frameId === rootFrameId()) return;
  const box = layoutFrame(frameId);
  box.x += dx;
  box.y += dy;
  for (const nodeId of frame.nodeIds || []) {
    const nodeBox = layoutNode(nodeId);
    nodeBox.x += dx;
    nodeBox.y += dy;
  }
  for (const childFrameId of frame.childFrameIds || []) shiftFrameSubtree(childFrameId, dx, dy);
};

const resolveExpandedFrameConflicts = (frameId) => {
  let currentFrame = frameById()[frameId];
  while (currentFrame?.parentFrameId) {
    const parentFrame = frameById()[currentFrame.parentFrameId];
    const currentBox = layoutFrame(currentFrame.id);
    const siblingItems = [
      ...(parentFrame.nodeIds || []).map((id) => ({ id, type: "node", box: layoutNode(id) })),
      ...(parentFrame.childFrameIds || [])
        .filter((id) => id !== currentFrame.id)
        .map((id) => ({ id, type: "frame", box: layoutFrame(id) }))
    ];

    const collidingSiblings = siblingItems.filter((sibling) => boxesOverlapWithGap(currentBox, sibling.box, 24));
    if (collidingSiblings.length) {
      const vertical = tree().layout.direction === "TB" || tree().layout.direction === "BT";
      const dx = vertical
        ? 0
        : currentBox.x + currentBox.width + 32 - Math.min(...collidingSiblings.map((sibling) => sibling.box.x));
      const dy = vertical
        ? currentBox.y + currentBox.height + 32 - Math.min(...collidingSiblings.map((sibling) => sibling.box.y))
        : 0;
      for (const sibling of collidingSiblings) {
        if (sibling.type === "frame") shiftFrameSubtree(sibling.id, dx, dy);
        else {
          sibling.box.x += dx;
          sibling.box.y += dy;
        }
      }
    }

    if (parentFrame.id === rootFrameId()) break;
    const parentBox = layoutFrame(parentFrame.id);
    const childBoxes = [
      ...(parentFrame.nodeIds || []).map((id) => layoutNode(id)),
      ...(parentFrame.childFrameIds || []).map((id) => layoutFrame(id))
    ];
    if (childBoxes.length) {
      parentBox.width = Math.max(parentBox.width, Math.max(...childBoxes.map((box) => box.x + box.width)) + 28 - parentBox.x);
      parentBox.height = Math.max(parentBox.height, Math.max(...childBoxes.map((box) => box.y + box.height)) + 28 - parentBox.y);
    }
    currentFrame = parentFrame;
  }
};

const placeNodeGroupInFrame = (nodeIds, targetFrameId, desiredPositions) => {
  const movedIds = new Set(nodeIds);
  const targetFrame = frameById()[targetFrameId];
  const desiredBoxes = nodeIds.map((id) => ({ ...layoutNode(id), ...desiredPositions[id] }));
  const desiredBounds = boundsForBoxes(desiredBoxes);
  const obstacles = [
    ...(targetFrame.nodeIds || [])
      .filter((id) => !movedIds.has(id) && nodeById()[id])
      .map((id) => layoutNode(id)),
    ...(targetFrame.childFrameIds || []).map((id) => layoutFrame(id))
  ];
  const targetBox = targetFrameId === rootFrameId() ? null : layoutFrame(targetFrameId);
  const left = targetBox ? targetBox.x + 28 : 48;
  const top = targetBox ? targetBox.y + 58 : 48;
  const right = targetBox ? targetBox.x + targetBox.width - 28 : Number.POSITIVE_INFINITY;
  const bottom = targetBox ? targetBox.y + targetBox.height - 28 : Number.POSITIVE_INFINITY;
  const candidateBoxes = (x, y) => {
    const dx = x - desiredBounds.x;
    const dy = y - desiredBounds.y;
    return desiredBoxes.map((box) => ({ ...box, x: box.x + dx, y: box.y + dy }));
  };
  const candidateFits = (boxes) => {
    const bounds = boundsForBoxes(boxes);
    const contained = bounds.x >= left && bounds.y >= top && bounds.x + bounds.width <= right && bounds.y + bounds.height <= bottom;
    return contained && boxes.every((box) => obstacles.every((obstacle) => !boxesOverlapWithGap(box, obstacle, 18)));
  };

  let placed = candidateBoxes(desiredBounds.x, desiredBounds.y);
  if (!candidateFits(placed) && targetBox) {
    const maxX = Math.max(left, right - desiredBounds.width);
    const maxY = Math.max(top, bottom - desiredBounds.height);
    outer: for (let y = top; y <= maxY; y += 28) {
      for (let x = left; x <= maxX; x += 28) {
        const candidate = candidateBoxes(x, y);
        if (!candidateFits(candidate)) continue;
        placed = candidate;
        break outer;
      }
    }
  }

  if (!candidateFits(placed)) {
    const vertical = tree().layout.direction === "TB" || tree().layout.direction === "BT";
    const obstacleBounds = obstacles.length ? boundsForBoxes(obstacles) : { x: left, y: top, width: 0, height: 0 };
    const appendX = vertical ? left : Math.max(left, obstacleBounds.x + obstacleBounds.width + 32);
    const appendY = vertical ? Math.max(top, obstacleBounds.y + obstacleBounds.height + 32) : top;
    placed = candidateBoxes(appendX, appendY);
    if (targetBox) {
      const placedBounds = boundsForBoxes(placed);
      targetBox.width = Math.max(targetBox.width, placedBounds.x + placedBounds.width + 28 - targetBox.x);
      targetBox.height = Math.max(targetBox.height, placedBounds.y + placedBounds.height + 28 - targetBox.y);
      let childFrame = targetFrame;
      while (childFrame.parentFrameId && childFrame.parentFrameId !== rootFrameId()) {
        const parentFrame = frameById()[childFrame.parentFrameId];
        const childBox = layoutFrame(childFrame.id);
        const parentBox = layoutFrame(parentFrame.id);
        parentBox.width = Math.max(parentBox.width, childBox.x + childBox.width + 28 - parentBox.x);
        parentBox.height = Math.max(parentBox.height, childBox.y + childBox.height + 28 - parentBox.y);
        childFrame = parentFrame;
      }
    }
  }

  return Object.fromEntries(nodeIds.map((id, index) => [id, { x: Math.round(placed[index].x), y: Math.round(placed[index].y) }]));
};

const moveNodesToFrame = async (nodeIds, targetFrameId, positions = {}) => {
  const nodes = nodeIds.map((nodeId) => nodeById()[nodeId]).filter(Boolean);
  const targetFrame = frameById()[targetFrameId];
  if (!nodes.length || !targetFrame) return;
  const movedNodeIds = new Set(nodes.map((node) => node.id));
  const previousFrameIds = new Set(nodes.map((node) => node.frameId));
  const desiredPositions = Object.fromEntries(
    nodes.map((node) => [node.id, positions[node.id] || { x: layoutNode(node.id).x, y: layoutNode(node.id).y }])
  );
  const placedPositions = placeNodeGroupInFrame(nodes.map((node) => node.id), targetFrameId, desiredPositions);

  for (const frame of canvas().frames) {
    frame.nodeIds = frame.nodeIds.filter((id) => !movedNodeIds.has(id));
  }
  for (const node of nodes) {
    if (!targetFrame.nodeIds.includes(node.id)) targetFrame.nodeIds.push(node.id);
    node.frameId = targetFrame.id;
    node.updatedAt = now();

    const box = tree().layout.nodes[node.id];
    box.x = placedPositions[node.id].x;
    box.y = placedPositions[node.id].y;
    box.layoutSource = "manual";
  }

  if (targetFrame.id !== rootFrameId()) resolveExpandedFrameConflicts(targetFrame.id);

  for (const link of tree().links) {
    const source = centerOf(layoutNode(link.sourceNodeId));
    const target = centerOf(layoutNode(link.targetNodeId));
    tree().layout.links[link.id] = {
      ...layoutLink(link.id),
      route: [],
      routeSource: "manual",
      labelPosition: {
        x: Math.round((source.x + target.x) / 2),
        y: Math.round((source.y + target.y) / 2)
      }
    };
  }

  await persist(nodes.length === 1 ? "Move entity" : "Move selected entities");
  const changedFrame = previousFrameIds.size !== 1 || !previousFrameIds.has(targetFrame.id);
  setStatus(
    changedFrame
      ? `${nodes.length} ${nodes.length === 1 ? "entity" : "entities"} moved to ${targetFrame.name}`
      : `${nodes.length} ${nodes.length === 1 ? "entity" : "entities"} moved`
  );
  render();
};

const moveNodeToFrame = (nodeId, targetFrameId, position = null) =>
  moveNodesToFrame([nodeId], targetFrameId, position ? { [nodeId]: position } : {});

const createLink = async (sourceNodeId, targetNodeId, options = {}) => {
  const { selectCreated = true, persistAfter = true, renderAfter = true } = options;
  const activeTree = tree();
  const source = nodeById()[sourceNodeId];
  const target = nodeById()[targetNodeId];
  if (!source || !target) return;

  const existingLink = activeTree.links.find((link) => link.sourceNodeId === sourceNodeId && link.targetNodeId === targetNodeId);
  if (existingLink) {
    if (selectCreated) {
      replaceSelection(existingLink.id);
    }
    if (renderAfter) render();
    return existingLink.id;
  }

  const id = uid("link");
  const sourceBox = layoutNode(sourceNodeId);
  const targetBox = layoutNode(targetNodeId);
  const link = {
    id,
    treeId: activeTree.id,
    sourceNodeId,
    targetNodeId,
    type: "necessity",
    logic: "necessity",
    meaning: `${source.shortLabel || source.statement} supports ${target.shortLabel || target.statement}.`,
    verbalization: `In order to achieve ${target.shortLabel || target.statement}, we must have/do ${source.shortLabel || source.statement}.`,
    assumptionIds: [],
    sourceIds: [],
    validation: {
      status: "draft",
      clarity: "unknown",
      logicCheck: "necessity-verbalized",
      missingAssumptions: true,
      notes: ""
    },
    visual: {
      route: [],
      routeSource: "auto",
      labelPosition: {
        x: Math.round((sourceBox.x + targetBox.x) / 2),
        y: Math.round((sourceBox.y + targetBox.y) / 2)
      }
    },
    createdAt: now(),
    updatedAt: now()
  };
  activeTree.links.push(link);
  activeTree.layout.links[id] = link.visual;
  if (selectCreated) {
    replaceSelection(id);
  }
  if (persistAfter) await persist("Create link");
  if (renderAfter) render();
  return id;
};

const createLinksToTarget = async (sourceNodeIds, targetNodeId) => {
  const linkIds = [];
  for (const sourceNodeId of sourceNodeIds) {
    const linkId = await createLink(sourceNodeId, targetNodeId, {
      selectCreated: false,
      persistAfter: false,
      renderAfter: false
    });
    if (linkId) linkIds.push(linkId);
  }
  await persist("Create links");
  return linkIds;
};

const addAssumptionToSelectedLink = async () => {
  const link = selectedLink();
  if (!link) return;
  const id = uid("assumption");
  const assumption = {
    id,
    treeId: tree().id,
    linkId: link.id,
    statement: "New assumption behind this link.",
    status: "draft",
    sourceIds: [],
    promotedNodeId: null,
    createdAt: now(),
    updatedAt: now()
  };
  tree().assumptions.push(assumption);
  link.assumptionIds.push(id);
  await persist("Add assumption");
  render();
};

const promoteAssumption = async (assumptionId) => {
  const assumption = tree().assumptions.find((item) => item.id === assumptionId);
  if (!assumption || assumption.promotedNodeId) return;
  const link = linkById()[assumption.linkId];
  const source = nodeById()[link.sourceNodeId];
  const nodeId = uid("node");
  const node = {
    id: nodeId,
    treeId: tree().id,
    frameId: source.frameId,
    type: "assumption",
    statement: assumption.statement,
    shortLabel: "Promoted assumption",
    status: "draft",
    tags: ["assumption"],
    sourceIds: assumption.sourceIds,
    validation: {
      clarity: "unknown",
      entityExistence: "unknown",
      singleIdea: "unknown",
      completeSentence: "unknown",
      confidence: "unknown",
      notes: ""
    },
    promotedFrom: { type: "assumption", id: assumption.id, linkId: link.id },
    createdAt: now(),
    updatedAt: now()
  };
  tree().nodes.push(node);
  frameById()[source.frameId].nodeIds.push(nodeId);
  const sourceBox = layoutNode(source.id);
  tree().layout.nodes[nodeId] = {
    x: sourceBox.x + 32,
    y: sourceBox.y + 120,
    width: 260,
    height: 72,
    pinned: false,
    layoutSource: "manual"
  };
  assumption.promotedNodeId = nodeId;
  replaceSelection(nodeId);
  connectionSourceIds.clear();
  multiSelectionMode = false;
  await persist("Promote assumption");
  render();
};

const togglePin = async () => {
  const activeTree = tree();
  if (selectedElementType === "node") {
    const box = activeTree.layout.nodes[selectedElementId];
    box.pinned = !box.pinned;
    box.layoutSource = box.pinned ? "manual" : "auto";
  }
  if (selectedElementType === "frame") {
    const box = canvas().layout.frames[selectedElementId];
    box.pinned = !box.pinned;
    box.layoutSource = box.pinned ? "manual" : "auto";
  }
  await persist("Toggle pin");
  render();
};

const interpolatedBoxMap = (startMap = {}, targetMap = {}, progress) =>
  Object.fromEntries(
    Object.entries(targetMap).map(([id, target]) => {
      const start = startMap[id] || target;
      const interpolate = (field) => (start[field] || 0) + ((target[field] || 0) - (start[field] || 0)) * progress;
      return [
        id,
        {
          ...target,
          x: interpolate("x"),
          y: interpolate("y"),
          width: interpolate("width"),
          height: interpolate("height")
        }
      ];
    })
  );

const interpolatedLinkMap = (startMap = {}, targetMap = {}, progress) =>
  Object.fromEntries(
    Object.entries(targetMap).map(([id, target]) => {
      const start = startMap[id] || target;
      const startLabel = start.labelPosition || target.labelPosition || { x: 0, y: 0 };
      const targetLabel = target.labelPosition || startLabel;
      return [
        id,
        {
          ...target,
          labelPosition: {
            x: startLabel.x + (targetLabel.x - startLabel.x) * progress,
            y: startLabel.y + (targetLabel.y - startLabel.y) * progress
          }
        }
      ];
    })
  );

const animateToLayout = async (nextWorkspace) => {
  const activeTree = tree();
  const activeCanvas = canvas();
  const nextTree = nextWorkspace.trees[0];
  const nextCanvas = nextWorkspace.canvases.find((candidate) => candidate.id === nextTree.canvasId);
  const startLayout = structuredClone(activeTree.layout);
  const targetLayout = nextTree.layout;
  const startFrameLayout = structuredClone(activeCanvas.layout?.frames || {});
  const targetFrameLayout = nextCanvas.layout?.frames || {};
  const moved = [...Object.keys(targetLayout.nodes || {}), ...Object.keys(targetFrameLayout)].filter((id) => {
    const start = startLayout.nodes?.[id] || startFrameLayout[id];
    const target = targetLayout.nodes?.[id] || targetFrameLayout[id];
    return start && target && (Math.abs(start.x - target.x) > 1 || Math.abs(start.y - target.y) > 1);
  });
  layoutAnimationMovedElements = moved.length;
  layoutAnimationFrameCount = 0;
  layoutAnimationConnectionsTracked = nextTree.links.length > 0;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (!moved.length || reduceMotion) {
    workspaceData = nextWorkspace;
    render();
    return;
  }

  const duration = 620;
  await new Promise((resolve) => {
    const startedAt = performance.now();
    const step = (timestamp) => {
      const linearProgress = clamp((timestamp - startedAt) / duration, 0, 1);
      const progress = 1 - Math.pow(1 - linearProgress, 3);
      activeTree.layout = {
        ...targetLayout,
        nodes: interpolatedBoxMap(startLayout.nodes, targetLayout.nodes, progress),
        links: interpolatedLinkMap(startLayout.links, targetLayout.links, progress)
      };
      activeCanvas.layout.frames = interpolatedBoxMap(startFrameLayout, targetFrameLayout, progress);
      layoutAnimationFrameCount += 1;
      render();
      const firstLink = activeTree.links[0];
      if (firstLink) {
        const line = app.querySelector(`[data-link-id="${firstLink.id}"]`);
        const endpoints = linkEndpoints(layoutNode(firstLink.sourceNodeId), layoutNode(firstLink.targetNodeId));
        layoutAnimationConnectionsTracked =
          layoutAnimationConnectionsTracked &&
          Math.abs(Number(line?.getAttribute("x1")) - endpoints.source.x) < 0.01 &&
          Math.abs(Number(line?.getAttribute("y2")) - endpoints.target.y) < 0.01;
      }
      if (linearProgress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });

  workspaceData = nextWorkspace;
  render();
};

const runAutoLayout = async () => {
  if (layoutAnimating) return;
  window.clearTimeout(viewPersistTimer);
  await workspaceOperationQueue;
  layoutAnimating = true;
  setStatus("Running ELK layout...");
  try {
    const nextWorkspace = await window.ltpPrototype.runLayout(workspaceData);
    setStatus("Repositioning diagram...");
    await animateToLayout(nextWorkspace);
    await persist("Apply layout", "spatial.layout");
    const quality = tree()?.layout?.quality;
    setStatus(
      quality
        ? `Layout optimized: ${quality.crossings} crossings, ${quality.bends} bends, ${quality.directionExceptions} direction exceptions`
        : "Composed layout updated"
    );
    render();
  } finally {
    layoutAnimating = false;
    render();
  }
};

const exportMarkdown = async () => {
  const result = await window.ltpPrototype.exportMarkdown(workspaceData);
  setStatus(`Exported Markdown: ${result.path}`);
};

const selectParentFrame = () => {
  const frame = frameById()[activeFrameId];
  if (frame?.parentFrameId) {
    activeFrameId = frame.parentFrameId;
    replaceSelection(activeFrameId);
    render();
  }
};

const setActiveFrame = (frameId) => {
  const frame = frameById()[frameId];
  if (!frame) return;
  activeFrameId = frame.id;
  setStatus(`Creation frame: ${frame.name}`);
  render();
  scheduleViewStatePersist();
  focusCanvas();
};

const enterSelectedFrame = () => {
  const frame = selectedFrame();
  if (frame) {
    activeFrameId = frame.id;
    render();
  }
};

const beginConnection = () => {
  const explicitSourceIds = selectedSourceNodeIds();
  const selectedNodeIds = [...selectionRootIds].filter((id) => Boolean(nodeById()[id]));
  const sourceIds = explicitSourceIds.length
    ? explicitSourceIds
    : selectedNodeIds.length
      ? selectedNodeIds
      : selectedNode()
        ? [selectedElementId]
        : [];
  if (!sourceIds.length) {
    setStatus("Select a node before entering connection mode");
    return;
  }
  connectionSourceIds = new Set(sourceIds);
  multiSelectionMode = false;
  mode = "connection";
  connectionSourceId = sourceIds[0];
  showHints();
  setStatus(`Connection mode: choose target node for ${sourceIds.length} source${sourceIds.length === 1 ? "" : "s"}`);
};

const toggleMultiSelect = () => {
  multiSelectionMode = !multiSelectionMode;
  mode = "navigation";
  connectionSourceId = null;
  hintBuffer = "";

  if (multiSelectionMode) {
    showHints();
    setStatus(`${selectionRootIds.size} element${selectionRootIds.size === 1 ? "" : "s"} selected. Choose more, then press M to finish.`);
    return;
  }

  hintsVisible = false;
  setStatus(`Multi-select finished: ${selectionRootIds.size} element${selectionRootIds.size === 1 ? "" : "s"} selected`);
  render();
};

const beginFrameTargetMode = () => {
  const roots = selectedMovableRoots();
  if (!roots.length) {
    setStatus("Select one or more nodes or frames before choosing a destination frame");
    return;
  }
  multiSelectionMode = false;
  connectionSourceId = null;
  connectionSourceIds.clear();
  hintsVisible = false;
  mode = "frame-target";
  fitView();
  showHints();
  setStatus(`Choose a destination frame for ${roots.length} selected root${roots.length === 1 ? "" : "s"}`);
};

const displayShortcutKey = (key) =>
  ({
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Backspace: "Backspace",
    Delete: "Delete",
    Enter: "Enter"
  })[key] || key.toUpperCase();

const formatShortcutBinding = (binding) => {
  const parts = [];
  if (binding.command) parts.push("Cmd");
  else if (binding.primary) parts.push("Cmd/Ctrl");
  if (binding.control) parts.push("Ctrl");
  if (binding.alt) parts.push("Alt");
  if (binding.shift) parts.push("Shift");
  parts.push(displayShortcutKey(binding.key));
  return parts.join("+");
};

const renderShortcutList = () =>
  Object.entries(commandBindings)
    .map(
      ([command, bindings]) => `
        <div class="shortcut-item" data-shortcut-command="${command}">
          <span class="shortcut-keys">
            ${bindings.map((binding) => `<kbd>${escapeHtml(formatShortcutBinding(binding))}</kbd>`).join("")}
          </span>
          <span>${escapeHtml(commandLabels[command] || command)}</span>
        </div>
      `
    )
    .join("");

const renderSidebar = () => {
  if (!panelState.leftOpen) {
    return `
      <aside class="side-panel panel-collapsed">
        <button class="panel-toggle" data-action="toggle-left-panel" title="Show left panel" aria-label="Show left panel">&gt;</button>
      </aside>
    `;
  }
  const activeSystem = system();
  const activeTree = tree();
  const profile = activeSystem?.profile || {};
  return `
    <aside class="side-panel">
      <button class="panel-toggle panel-toggle-end" data-action="toggle-left-panel" title="Hide left panel" aria-label="Hide left panel">&lt;</button>
      <div class="brand">
        <div class="brand-mark">LTP</div>
        <div>
          <h1>Technical Prototype</h1>
          <p>Goal Tree, keyboard hints, frames, links</p>
        </div>
      </div>

      <section class="side-section">
        <h2>System</h2>
        <dl>
          <dt>Name</dt>
          <dd>${escapeHtml(activeSystem?.name)}</dd>
          <dt>Owner</dt>
          <dd>${escapeHtml(profile.owner?.name || "Unknown")}</dd>
          <dt>Boundary</dt>
          <dd>${escapeHtml(profile.boundary?.summary || "")}</dd>
        </dl>
      </section>

      <section class="side-section">
        <h2>Tree</h2>
        <dl>
          <dt>Name</dt>
          <dd>${escapeHtml(activeTree?.name)}</dd>
          <dt>Logic</dt>
          <dd>${escapeHtml(activeTree?.logicMode)}</dd>
          <dt>Active frame</dt>
          <dd>
            <div class="frame-context-row">
              <select class="frame-context-select" data-active-frame aria-label="Creation frame">
                ${canvas().frames
                  .map(
                    (frame) =>
                      `<option value="${frame.id}" ${frame.id === activeFrameId ? "selected" : ""}>${escapeHtml(frame.name)}${frame.id === rootFrameId() ? " (root)" : ""}</option>`
                  )
                  .join("")}
              </select>
              <button class="frame-root-action" data-action="activate-root-frame" title="Use root as creation frame">Root</button>
            </div>
          </dd>
        </dl>
      </section>

      <section class="side-section shortcuts">
        <h2>Keyboard</h2>
        <details class="shortcut-details" open>
          <summary>All shortcuts</summary>
          <div class="shortcut-list">
            ${renderShortcutList()}
          </div>
        </details>
      </section>

      <button class="primary-action" data-action="layout">Run ELK layout</button>
      <button class="secondary-action" data-action="export">Export Markdown</button>
    </aside>
  `;
};

const renderFrames = () => {
  return canvas().frames
    .filter((frame) => frame.id !== rootFrameId())
    .map((frame) => {
      const box = layoutFrame(frame.id);
      const active = frame.id === activeFrameId ? "active" : "";
      const selected = frame.id === selectedElementId ? "selected" : "";
      const included = selectionIds.has(frame.id) && frame.id !== selectedElementId ? "selection-included" : "";
      return `
        <button class="tree-frame ${active} ${selected} ${included}" data-element-id="${frame.id}" data-element-type="frame"
          style="left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;">
          <span>${escapeHtml(frame.name)}</span>
          <small>${escapeHtml(frame.semanticType || "visual frame")}</small>
        </button>
      `;
    })
    .join("");
};

const nodeTypeLabel = (type) => diagramNodeTypes().find((candidate) => candidate.id === type)?.shortLabel || type;

const frameInventory = (frameId) => {
  const ids = new Set(window.LTP_SELECTION_MODEL.selectionClosure(tree(), [frameId], canvas()?.frames));
  const typeCounts = new Map();
  for (const node of tree().nodes.filter((candidate) => ids.has(candidate.id))) {
    const label = nodeTypeLabel(node.type);
    typeCounts.set(label, (typeCounts.get(label) || 0) + 1);
  }
  const linkIds = new Set(tree().links.filter((link) => ids.has(link.id)).map((link) => link.id));
  return {
    types: [...typeCounts.entries()],
    frames: canvas().frames.filter((frame) => frame.id !== frameId && ids.has(frame.id)).length,
    links: linkIds.size,
    assumptions: tree().assumptions.filter((assumption) => linkIds.has(assumption.linkId)).length
  };
};

const renderFrameInventoryItems = (inventory) => [
  ...inventory.types.map(([label, count]) => `<span>${escapeHtml(label)}: <strong>${count}</strong></span>`),
  `<span>Frames: <strong>${inventory.frames}</strong></span>`,
  `<span>Links: <strong>${inventory.links}</strong></span>`,
  `<span>Assumptions: <strong>${inventory.assumptions}</strong></span>`
].join("");

const layoutDirectionLabel = (direction) =>
  ({
    TB: "Top to bottom",
    BT: "Bottom to top",
    LR: "Left to right",
    RL: "Right to left"
  })[direction] || direction;

const updateLayoutDirection = async (direction) => {
  if (!diagramDefinition()?.directions.includes(direction)) return;
  tree().layout.direction = direction;
  await persist("Change layout direction");
  setStatus(`Layout direction: ${layoutDirectionLabel(direction)}`);
  render();
};

const renderNodes = () =>
  tree()
    .nodes.map((node) => {
      const box = layoutNode(node.id);
      const selected = node.id === selectedElementId ? "selected" : "";
      const included = selectionIds.has(node.id) && node.id !== selectedElementId ? "selection-included" : "";
      const multiSelected = connectionSourceIds.has(node.id) ? "multi-selected" : "";
      return `
        <button class="tree-node ${selected} ${included} ${multiSelected} node-${node.type}" data-element-id="${node.id}" data-element-type="node"
          style="left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;"
          title="${escapeHtml(node.statement)}">
          <strong>${escapeHtml(nodeTypeLabel(node.type))}</strong>
          <span>${escapeHtml(node.statement)}</span>
          ${box.pinned ? "<em>Pinned</em>" : ""}
        </button>
      `;
    })
    .join("");

const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const selectionCenter = () => {
  const boxes = [];
  for (const id of selectionIds) {
    const type = elementType(id);
    if (type === "node") boxes.push(layoutNode(id));
    if (type === "frame" && id !== rootFrameId()) boxes.push(layoutFrame(id));
    if (type === "link") {
      const point = layoutLink(id).labelPosition;
      if (point) boxes.push({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  }
  if (!boxes.length) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
};

const linkEndpoints = (sourceBox, targetBox) => {
  const sourceCenter = centerOf(sourceBox);
  const targetCenter = centerOf(targetBox);
  const preferred =
    ({
      TB: { x: 0, y: 1 },
      BT: { x: 0, y: -1 },
      LR: { x: 1, y: 0 },
      RL: { x: -1, y: 0 }
    })[tree()?.layout?.direction] || { x: 0, y: 1 };
  const delta = { x: targetCenter.x - sourceCenter.x, y: targetCenter.y - sourceCenter.y };
  const vector =
    delta.x * preferred.x + delta.y * preferred.y > 0.0001
      ? preferred
      : Math.abs(delta.x) > Math.abs(delta.y)
        ? { x: delta.x >= 0 ? 1 : -1, y: 0 }
        : { x: 0, y: delta.y >= 0 ? 1 : -1 };
  const sourceDistance = vector.x ? sourceBox.width / 2 : sourceBox.height / 2;
  const targetDistance = vector.x ? targetBox.width / 2 : targetBox.height / 2;
  return {
    source: {
      x: sourceCenter.x + vector.x * sourceDistance,
      y: sourceCenter.y + vector.y * sourceDistance
    },
    target: {
      x: targetCenter.x - vector.x * targetDistance,
      y: targetCenter.y - vector.y * targetDistance
    }
  };
};

const renderLinks = () => {
  const activeTree = tree();
  const size = canvasSize();
  const markerScale = 1 / clamp(zoomLevel, 0.35, 2.5);
  const markerNumber = (value) => Math.round(value * markerScale * 100) / 100;
  const lines = activeTree.links
    .map((link) => {
      const sourceBox = layoutNode(link.sourceNodeId);
      const targetBox = layoutNode(link.targetNodeId);
      const { source, target } = linkEndpoints(sourceBox, targetBox);
      const selected = link.id === selectedElementId ? "selected" : "";
      const included = selectionIds.has(link.id) && link.id !== selectedElementId ? "selection-included" : "";
      const marker = selected ? "arrow-selected" : included ? "arrow-included" : "arrow";
      const route = layoutLink(link.id).route || [];
      if (!layoutAnimating && route.length >= 2) {
        const path = route.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
        return `<path class="tree-link-line ${selected} ${included}" data-link-id="${link.id}" d="${path}" marker-end="url(#${marker})" />`;
      }
      return `<line class="tree-link-line ${selected} ${included}" data-link-id="${link.id}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" marker-end="url(#${marker})" />`;
    })
    .join("");

  const hitTargets = activeTree.links
    .map((link) => {
      const label = layoutLink(link.id).labelPosition || { x: 0, y: 0 };
      const selected = link.id === selectedElementId ? "selected" : "";
      const included = selectionIds.has(link.id) && link.id !== selectedElementId ? "selection-included" : "";
      const hintVisible = hintsVisible ? "hint-visible" : "";
      return `
        <button class="link-target ${selected} ${included} ${hintVisible}" data-element-id="${link.id}" data-element-type="link" style="left:${label.x - 12}px;top:${label.y - 12}px;" title="${escapeHtml(link.meaning)}">L</button>
      `;
    })
    .join("");

  return `
    <svg class="links-svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
      <defs>
        <marker id="arrow" markerWidth="${markerNumber(12)}" markerHeight="${markerNumber(12)}" refX="${markerNumber(11)}" refY="${markerNumber(4)}" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L0,${markerNumber(8)} L${markerNumber(11)},${markerNumber(4)} z" fill="#3f4945"></path>
        </marker>
        <marker id="arrow-selected" markerWidth="${markerNumber(13)}" markerHeight="${markerNumber(13)}" refX="${markerNumber(12)}" refY="${markerNumber(4.5)}" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L0,${markerNumber(9)} L${markerNumber(12)},${markerNumber(4.5)} z" fill="#9f4f45"></path>
        </marker>
        <marker id="arrow-included" markerWidth="${markerNumber(13)}" markerHeight="${markerNumber(13)}" refX="${markerNumber(12)}" refY="${markerNumber(4.5)}" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L0,${markerNumber(9)} L${markerNumber(12)},${markerNumber(4.5)} z" fill="#c58f2c"></path>
        </marker>
      </defs>
      ${lines}
    </svg>
    ${hitTargets}
  `;
};

const renderHints = () => {
  if (!hintsVisible) return "";
  return hintEntries
    .map(
      (entry) => `
        <div class="hint-badge hint-${entry.type}" style="left:${entry.x * zoomLevel}px;top:${entry.y * zoomLevel}px;">
          ${entry.hint}
        </div>
      `
    )
    .join("");
};

const breadcrumb = () => {
  const frames = frameById();
  const parts = [];
  let frame = frames[activeFrameId];
  while (frame) {
    parts.unshift(frame.name);
    frame = frames[frame.parentFrameId];
  }
  return [system()?.name, tree()?.name, ...parts].filter(Boolean).join(" / ");
};

const minimapMetrics = () => {
  const size = canvasSize();
  const shell = app.querySelector(".canvas-shell");
  const maxWidth = 180;
  const maxHeight = 120;
  const clientWidth = shell?.clientWidth || viewportSize.width;
  const clientHeight = shell?.clientHeight || viewportSize.height;
  const domain = {
    x: 0,
    y: 0,
    width: Math.max(size.width, clientWidth / zoomLevel),
    height: Math.max(size.height, clientHeight / zoomLevel)
  };
  const scale = Math.min(maxWidth / domain.width, maxHeight / domain.height);
  return {
    scale,
    domain,
    width: Math.max(1, Math.round(domain.width * scale)),
    height: Math.max(1, Math.round(domain.height * scale))
  };
};

const minimapViewportStyle = (metrics = minimapMetrics()) => {
  const shell = app.querySelector(".canvas-shell");
  const clientWidth = shell?.clientWidth || viewportSize.width;
  const clientHeight = shell?.clientHeight || viewportSize.height;
  const width = clamp((clientWidth / zoomLevel) * metrics.scale, 4, metrics.width);
  const height = clamp((clientHeight / zoomLevel) * metrics.scale, 4, metrics.height);
  return {
    left: clamp((viewportState.left / zoomLevel - metrics.domain.x) * metrics.scale, 0, metrics.width - width),
    top: clamp((viewportState.top / zoomLevel - metrics.domain.y) * metrics.scale, 0, metrics.height - height),
    width,
    height
  };
};

const updateMinimapViewport = () => {
  const viewport = app.querySelector(".minimap-viewport");
  if (!viewport) return;
  const style = minimapViewportStyle();
  viewport.style.left = `${style.left}px`;
  viewport.style.top = `${style.top}px`;
  viewport.style.width = `${style.width}px`;
  viewport.style.height = `${style.height}px`;
};

const renderMinimapContents = (metrics) => {
  const viewport = minimapViewportStyle(metrics);
  const mapX = (value) => (value - metrics.domain.x) * metrics.scale;
  const mapY = (value) => (value - metrics.domain.y) * metrics.scale;
  const linkLines = tree()
    .links.map((link) => {
      const source = centerOf(layoutNode(link.sourceNodeId));
      const target = centerOf(layoutNode(link.targetNodeId));
      return `<line x1="${mapX(source.x)}" y1="${mapY(source.y)}" x2="${mapX(target.x)}" y2="${mapY(target.y)}" />`;
    })
    .join("");
  const frames = canvas()
    .frames.filter((frame) => frame.id !== rootFrameId())
    .map((frame) => {
      const box = layoutFrame(frame.id);
      return `<div class="minimap-frame" style="left:${mapX(box.x)}px;top:${mapY(box.y)}px;width:${box.width * metrics.scale}px;height:${box.height * metrics.scale}px;"></div>`;
    })
    .join("");
  const nodes = tree()
    .nodes.map((node) => {
      const box = layoutNode(node.id);
      return `<div class="minimap-node minimap-node-${node.type}" style="left:${mapX(box.x)}px;top:${mapY(box.y)}px;width:${Math.max(3, box.width * metrics.scale)}px;height:${Math.max(2, box.height * metrics.scale)}px;"></div>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${metrics.width} ${metrics.height}" width="${metrics.width}" height="${metrics.height}">${linkLines}</svg>
    ${frames}
    ${nodes}
    <div class="minimap-viewport" style="left:${viewport.left}px;top:${viewport.top}px;width:${viewport.width}px;height:${viewport.height}px;"></div>
  `;
};

const updateMinimapGeometry = () => {
  const map = app.querySelector("[data-minimap-map]");
  if (!map) return;
  const metrics = minimapMetrics();
  map.dataset.scale = metrics.scale;
  map.dataset.originX = metrics.domain.x;
  map.dataset.originY = metrics.domain.y;
  map.dataset.domainWidth = metrics.domain.width;
  map.dataset.domainHeight = metrics.domain.height;
  map.style.width = `${metrics.width}px`;
  map.style.height = `${metrics.height}px`;
  map.innerHTML = renderMinimapContents(metrics);
};

const renderMinimap = () => {
  const metrics = minimapMetrics();

  return `
    <div class="minimap" aria-label="Diagram minimap">
      <div class="minimap-map" data-minimap-map data-scale="${metrics.scale}" data-origin-x="${metrics.domain.x}" data-origin-y="${metrics.domain.y}" data-domain-width="${metrics.domain.width}" data-domain-height="${metrics.domain.height}" style="width:${metrics.width}px;height:${metrics.height}px;">
        ${renderMinimapContents(metrics)}
      </div>
    </div>
  `;
};

const openNodePreview = (nodeId = selectedElementId) => {
  if (!nodeById()[nodeId]) return;
  replaceSelection(nodeId);
  previewNodeId = nodeId;
  render();
  app.querySelector("[data-action='close-node-preview']")?.focus();
};

const closeNodePreview = (options = {}) => {
  const nodeId = previewNodeId;
  previewNodeId = null;
  if (options.continueEditing && nodeById()[nodeId]) {
    replaceSelection(nodeId);
    focusPrimaryEditor();
    return;
  }
  render();
};

const toggleNodePreview = () => {
  if (previewNodeId) {
    closeNodePreview();
    return;
  }
  openNodePreview();
};

const cancelContext = (options = {}) => {
  if (deleteCandidateId) {
    deleteCandidateId = null;
    setStatus("Deletion cancelled");
    render();
    focusCanvas();
    return;
  }

  if (previewNodeId) {
    closeNodePreview();
    setStatus("Preview closed");
    return;
  }

  if (mode === "connection" || mode === "frame-target" || mode === "editing" || multiSelectionMode || connectionSourceIds.size) {
    if (mode === "editing") restoreInspectorAfterEditing();
    mode = "navigation";
    connectionSourceId = null;
    multiSelectionMode = false;
    connectionSourceIds.clear();
    hintsVisible = false;
    setStatus("Current mode cancelled");
    render();
    scheduleViewStatePersist();
    focusCanvas();
    return;
  }

  if (hintsVisible) {
    hideHints();
    setStatus("Hints closed");
    return;
  }

  if (options.clearSelection && selectedElementId) {
    replaceSelection(null);
    setStatus("Selection cleared");
    render();
    focusCanvas();
    return;
  }

  mode = "navigation";
  connectionSourceId = null;
  render();
  focusCanvas();
};

const deletionImpact = (id = deleteCandidateId) => {
  const activeTree = tree();
  const type = elementType(id);
  if (type === "link") {
    return { type, label: "link", nodes: 0, frames: 0, links: 1 };
  }
  if (type === "node") {
    const node = nodeById()[id];
    const links = activeTree.links.filter((link) => link.sourceNodeId === id || link.targetNodeId === id).length;
    return { type, label: node?.shortLabel || node?.statement || "node", nodes: 1, frames: 0, links };
  }
  if (type === "frame") {
    const frameIds = new Set();
    const collectFrames = (frameId) => {
      if (frameIds.has(frameId)) return;
      frameIds.add(frameId);
      for (const childId of frameById()[frameId]?.childFrameIds || []) collectFrames(childId);
    };
    collectFrames(id);
    const nodeIds = new Set(activeTree.nodes.filter((node) => frameIds.has(node.frameId)).map((node) => node.id));
    const links = activeTree.links.filter(
      (link) => nodeIds.has(link.sourceNodeId) || nodeIds.has(link.targetNodeId)
    ).length;
    return {
      type,
      label: frameById()[id]?.name || "frame",
      nodes: nodeIds.size,
      frames: frameIds.size,
      links
    };
  }
  return { type: "unknown", label: "selection", nodes: 0, frames: 0, links: 0 };
};

const requestDeleteSelection = (id = selectedElementId) => {
  const type = elementType(id);
  if (type === "unknown") {
    setStatus("Select a node, link, or frame to delete");
    return;
  }
  if (type === "frame" && (id === rootFrameId() || id === tree().hostFrameId)) {
    setStatus(id === rootFrameId() ? "The root frame cannot be deleted" : "The tree frame cannot be deleted separately from its tree");
    return;
  }
  previewNodeId = null;
  deleteCandidateId = id;
  render();
  app.querySelector("[data-action='confirm-delete']")?.focus();
};

const removeLinks = (linkIds) => {
  const activeTree = tree();
  activeTree.links = activeTree.links.filter((link) => !linkIds.has(link.id));
  activeTree.assumptions = activeTree.assumptions.filter((assumption) => !linkIds.has(assumption.linkId));
  for (const linkId of linkIds) delete activeTree.layout.links[linkId];
};

const confirmDeletion = async () => {
  const activeTree = tree();
  const activeCanvas = canvas();
  const id = deleteCandidateId;
  const type = elementType(id);
  if (type === "unknown") {
    deleteCandidateId = null;
    render();
    return;
  }

  if (type === "link") {
    removeLinks(new Set([id]));
  }

  if (type === "node") {
    const connectedLinkIds = new Set(
      activeTree.links
        .filter((link) => link.sourceNodeId === id || link.targetNodeId === id)
        .map((link) => link.id)
    );
    removeLinks(connectedLinkIds);
    activeTree.nodes = activeTree.nodes.filter((node) => node.id !== id);
    for (const frame of activeCanvas.frames) frame.nodeIds = frame.nodeIds.filter((nodeId) => nodeId !== id);
    for (const assumption of activeTree.assumptions) {
      if (assumption.promotedNodeId === id) assumption.promotedNodeId = null;
    }
    delete activeTree.layout.nodes[id];
  }

  if (type === "frame" && id !== rootFrameId() && id !== activeTree.hostFrameId) {
    const frameIds = new Set();
    const collectFrames = (frameId) => {
      if (frameIds.has(frameId)) return;
      frameIds.add(frameId);
      for (const childId of frameById()[frameId]?.childFrameIds || []) collectFrames(childId);
    };
    collectFrames(id);
    const nodeIds = new Set(activeTree.nodes.filter((node) => frameIds.has(node.frameId)).map((node) => node.id));
    const connectedLinkIds = new Set(
      activeTree.links
        .filter((link) => nodeIds.has(link.sourceNodeId) || nodeIds.has(link.targetNodeId))
        .map((link) => link.id)
    );
    removeLinks(connectedLinkIds);
    activeTree.nodes = activeTree.nodes.filter((node) => !nodeIds.has(node.id));
    activeCanvas.frames = activeCanvas.frames.filter((frame) => !frameIds.has(frame.id));
    for (const frame of activeCanvas.frames) {
      frame.childFrameIds = frame.childFrameIds.filter((frameId) => !frameIds.has(frameId));
      frame.nodeIds = frame.nodeIds.filter((nodeId) => !nodeIds.has(nodeId));
    }
    for (const assumption of activeTree.assumptions) {
      if (nodeIds.has(assumption.promotedNodeId)) assumption.promotedNodeId = null;
    }
    for (const nodeId of nodeIds) delete activeTree.layout.nodes[nodeId];
    for (const frameId of frameIds) delete activeCanvas.layout.frames[frameId];
    if (frameIds.has(activeFrameId)) activeFrameId = activeTree.hostFrameId;
  }

  deleteCandidateId = null;
  replaceSelection(null);
  connectionSourceIds.clear();
  mode = "navigation";
  await persist("Delete selection");
  setStatus("Selection deleted");
  render();
  focusCanvas();
};

const renderDeleteConfirmation = () => {
  if (!deleteCandidateId) return "";
  const impact = deletionImpact();
  return `
    <div class="delete-backdrop" data-action="cancel-delete">
      <section class="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h2 id="delete-title">Delete ${escapeHtml(impact.label)}?</h2>
        <p>This removes ${impact.nodes} node(s), ${impact.frames} frame(s), and ${impact.links} link(s), including related assumptions and layout data.</p>
        <div class="delete-actions">
          <button data-action="cancel-delete">Cancel</button>
          <button class="danger-action" data-action="confirm-delete">Delete</button>
        </div>
      </section>
    </div>
  `;
};

const renderNodePreview = () => {
  const node = nodeById()[previewNodeId];
  if (!node) return "";
  return `
    <div class="node-preview-backdrop" data-action="close-node-preview">
      <section class="node-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="node-preview-title">
        <div class="node-preview-header">
          <div>
            <span>${escapeHtml(nodeTypeLabel(node.type))}</span>
            <h2 id="node-preview-title">${escapeHtml(node.shortLabel || "Full statement")}</h2>
          </div>
          <button data-action="close-node-preview" aria-label="Close full statement">Close</button>
        </div>
        <p>${escapeHtml(node.statement)}</p>
      </section>
    </div>
  `;
};

const renderCanvas = () => {
  const size = canvasSize();
  const scaledWidth = Math.round(size.width * zoomLevel);
  const scaledHeight = Math.round(size.height * zoomLevel);
  const inventory = selectedFrame() ? frameInventory(selectedElementId) : null;
  return `
    <main class="prototype-main">
      <header class="prototype-topbar">
        <div>
          <div class="topbar-title-row">
            <h2>${escapeHtml(tree()?.name)}</h2>
            <span class="build-identity" title="${escapeHtml(buildInfo.name)}">v${escapeHtml(buildInfo.version)} | build ${escapeHtml(buildInfo.id)}</span>
          </div>
          <p>${escapeHtml(breadcrumb())}</p>
        </div>
        <div class="topbar-actions">
          <input class="search-input" data-search value="${escapeHtml(searchText)}" placeholder="Search (/)" />
          <div class="history-controls" aria-label="Change history">
            <button data-action="undo" title="Undo${historyState.undoLabel ? `: ${escapeHtml(historyState.undoLabel)}` : ""}" aria-label="Undo" ${historyState.canUndo ? "" : "disabled"}>&#8630;</button>
            <button data-action="redo" title="Redo${historyState.redoLabel ? `: ${escapeHtml(historyState.redoLabel)}` : ""}" aria-label="Redo" ${historyState.canRedo ? "" : "disabled"}>&#8631;</button>
          </div>
          <div class="zoom-controls" aria-label="Zoom controls">
            <button data-action="zoom-out" title="Zoom out">-</button>
            <button data-action="zoom-reset" title="Reset zoom">${Math.round(zoomLevel * 100)}%</button>
            <button data-action="zoom-in" title="Zoom in">+</button>
            <button data-action="fit-view" title="Fit diagram">Fit</button>
          </div>
          <select class="direction-select" data-layout-direction title="Preferred layout direction" aria-label="Preferred layout direction">
            ${diagramDefinition().directions
              .map(
                (direction) =>
                  `<option value="${direction}" ${tree()?.layout?.direction === direction ? "selected" : ""}>${layoutDirectionLabel(direction)}</option>`
              )
              .join("")}
          </select>
          <button class="${hintsVisible ? "is-active" : ""}" data-action="hints" aria-pressed="${hintsVisible}">Hints</button>
          <button data-action="layout">Layout</button>
        </div>
      </header>

      <div class="canvas-shell">
        <div class="canvas-status">
          <span>Mode: <strong>${escapeHtml(mode)}</strong></span>
          ${inventory ? renderFrameInventoryItems(inventory) : `<span>Selected: <strong>${selectionRootIds.size}</strong></span>`}
          <span>Sources: <strong>${connectionSourceIds.size}</strong></span>
          <span>Frame: <strong>${escapeHtml(frameById()[activeFrameId]?.name || "none")}${activeFrameId === rootFrameId() ? " (root)" : ""}</strong></span>
          <span>Zoom: <strong>${Math.round(zoomLevel * 100)}%</strong></span>
          <span data-status>${escapeHtml(statusText)}</span>
        </div>
        <div class="canvas" tabindex="0" style="width:${scaledWidth}px;height:${scaledHeight}px;">
          <div class="canvas-content" style="width:${size.width}px;height:${size.height}px;transform:scale(${zoomLevel});">
            ${renderLinks()}
            ${renderFrames()}
            ${renderNodes()}
          </div>
          ${renderHints()}
        </div>
      </div>
      ${renderMinimap()}
    </main>
  `;
};

const renderInspector = () => {
  if (!panelState.rightOpen) {
    return `
      <aside class="inspector panel-collapsed">
        <button class="panel-toggle" data-action="toggle-right-panel" title="Show inspector" aria-label="Show inspector">&lt;</button>
      </aside>
    `;
  }
  const node = selectedNode();
  const frame = selectedFrame();
  const link = selectedLink();

  if (node) {
    return `
      <aside class="inspector">
        <button class="panel-toggle" data-action="toggle-right-panel" title="Hide inspector" aria-label="Hide inspector">&gt;</button>
        <h2>${escapeHtml(nodeTypeLabel(node.type))}</h2>
        <label>Statement</label>
        <textarea data-primary-editor data-node-field="statement" data-id="${node.id}">${escapeHtml(node.statement)}</textarea>
        <label>Short label</label>
        <input data-node-field="shortLabel" data-id="${node.id}" value="${escapeHtml(node.shortLabel || "")}" />
        <label>Type</label>
        <select data-node-field="type" data-id="${node.id}">
          ${diagramNodeTypes().map((type) => `<option value="${type.id}" ${node.type === type.id ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("")}
        </select>
        <label>Frame</label>
        <select data-node-frame data-id="${node.id}">
          ${canvas()
            .frames.map(
              (frame) =>
                `<option value="${frame.id}" ${node.frameId === frame.id ? "selected" : ""}>${escapeHtml(frame.name)}</option>`
            )
            .join("")}
        </select>
        <button data-action="open-node-preview">View full statement</button>
        <button data-action="pin">Toggle pin</button>
        <button class="danger-action" data-action="delete-selection">Delete node</button>
      </aside>
    `;
  }

  if (frame) {
    const inventory = frameInventory(frame.id);
    return `
      <aside class="inspector">
        <button class="panel-toggle" data-action="toggle-right-panel" title="Hide inspector" aria-label="Hide inspector">&gt;</button>
        <h2>Frame</h2>
        <label>Name</label>
        <input data-primary-editor data-frame-field="name" data-id="${frame.id}" value="${escapeHtml(frame.name)}" />
        <label>Semantic type</label>
        <input data-frame-field="semanticType" data-id="${frame.id}" value="${escapeHtml(frame.semanticType || "")}" />
        <label>Notes</label>
        <textarea data-frame-field="notes" data-id="${frame.id}">${escapeHtml(frame.notes || "")}</textarea>
        <label>Contents</label>
        <div class="frame-inventory">${renderFrameInventoryItems(inventory)}</div>
        <button data-action="enter-frame">Enter frame</button>
        <button data-action="pin">Toggle pin</button>
        ${frame.id === rootFrameId() || frame.id === tree().hostFrameId ? "" : '<button class="danger-action" data-action="delete-selection">Delete frame</button>'}
      </aside>
    `;
  }

  if (link) {
    const assumptions = assumptionsForLink(link.id);
    return `
      <aside class="inspector">
        <button class="panel-toggle" data-action="toggle-right-panel" title="Hide inspector" aria-label="Hide inspector">&gt;</button>
        <h2>Link</h2>
        <label>Meaning</label>
        <textarea data-primary-editor data-link-field="meaning" data-id="${link.id}">${escapeHtml(link.meaning || "")}</textarea>
        <label>Verbalization</label>
        <textarea data-link-field="verbalization" data-id="${link.id}">${escapeHtml(link.verbalization || "")}</textarea>
        <div class="inspector-row">
          <strong>Assumptions</strong>
          <button data-action="add-assumption">Add</button>
        </div>
        <div class="assumption-list">
          ${assumptions
            .map(
              (assumption) => `
                <article class="assumption-item">
                  <textarea data-assumption-id="${assumption.id}">${escapeHtml(assumption.statement)}</textarea>
                  <button data-promote-assumption="${assumption.id}">Promote to node</button>
                </article>
              `
            )
            .join("")}
        </div>
        <button class="danger-action" data-action="delete-selection">Delete link</button>
      </aside>
    `;
  }

  return `<aside class="inspector"><button class="panel-toggle" data-action="toggle-right-panel" title="Hide inspector" aria-label="Hide inspector">&gt;</button><h2>Inspector</h2><p>Select a node, frame, or link.</p></aside>`;
};

const render = () => {
  captureViewport();
  updateViewState();
  refreshMaps();
  app.innerHTML = `
    <div class="prototype-shell ${panelState.leftOpen ? "" : "left-collapsed"} ${panelState.rightOpen ? "" : "right-collapsed"}">
      ${renderSidebar()}
      ${renderCanvas()}
      ${renderInspector()}
    </div>
    ${renderNodePreview()}
    ${renderDeleteConfirmation()}
  `;
  bindEvents();
  restoreViewport();
  captureViewport();
  updateMinimapGeometry();
};

const commitInspectorField = async (field) => {
  mode = "navigation";
  const { id, nodeField, frameField, linkField, assumptionId } = field.dataset;

  if (nodeField) await updateNode(id, nodeField, field.value);
  if (frameField) await updateFrame(id, frameField, field.value || null);
  if (linkField) await updateLink(id, linkField, field.value);
  if (assumptionId) await updateAssumption(assumptionId, field.value);

  restoreInspectorAfterEditing();
  setStatus("Changes accepted");
  render();
  scheduleViewStatePersist();
  focusCanvas();
};

const updateDraggedNodeVisual = (nodeId, nextBox, boxOverrides = {}) => {
  const element = app.querySelector(`[data-element-id="${nodeId}"]`);
  if (element) {
    element.style.left = `${nextBox.x}px`;
    element.style.top = `${nextBox.y}px`;
  }

  for (const link of tree().links.filter((item) => item.sourceNodeId === nodeId || item.targetNodeId === nodeId)) {
    const sourceBox = boxOverrides[link.sourceNodeId] || layoutNode(link.sourceNodeId);
    const targetBox = boxOverrides[link.targetNodeId] || layoutNode(link.targetNodeId);
    const endpoints = linkEndpoints(sourceBox, targetBox);
    const line = app.querySelector(`[data-link-id="${link.id}"]`);
    if (line?.tagName.toLowerCase() === "path") {
      line.setAttribute("d", `M${endpoints.source.x},${endpoints.source.y} L${endpoints.target.x},${endpoints.target.y}`);
    } else {
      line?.setAttribute("x1", endpoints.source.x);
      line?.setAttribute("y1", endpoints.source.y);
      line?.setAttribute("x2", endpoints.target.x);
      line?.setAttribute("y2", endpoints.target.y);
    }
    const linkTarget = app.querySelector(`.link-target[data-element-id="${link.id}"]`);
    if (linkTarget) {
      linkTarget.style.left = `${(endpoints.source.x + endpoints.target.x) / 2 - 12}px`;
      linkTarget.style.top = `${(endpoints.source.y + endpoints.target.y) / 2 - 12}px`;
    }
  }
};

const beginNodeDrag = (event, element) => {
  if (event.button !== 0 || layoutAnimating) return;
  const nodeId = element.dataset.elementId;
  const draggedNodeIds = selectionRootIds.has(nodeId)
    ? [...selectionRootIds].filter((id) => Boolean(nodeById()[id]))
    : [nodeId];
  const startBoxes = Object.fromEntries(draggedNodeIds.map((id) => [id, { ...layoutNode(id) }]));
  const startBox = startBoxes[nodeId];
  const startPointer = { x: event.clientX, y: event.clientY };
  let nextBoxes = structuredClone(startBoxes);
  let dragging = false;
  let targetFrame = frameById()[nodeById()[nodeId]?.frameId];

  const move = (moveEvent) => {
    const dx = (moveEvent.clientX - startPointer.x) / zoomLevel;
    const dy = (moveEvent.clientY - startPointer.y) / zoomLevel;
    if (!dragging && Math.hypot(dx, dy) < 5) return;
    dragging = true;
    moveEvent.preventDefault();
    nextBoxes = Object.fromEntries(
      draggedNodeIds.map((id) => [id, { ...startBoxes[id], x: startBoxes[id].x + dx, y: startBoxes[id].y + dy }])
    );
    targetFrame = frameAtPoint(centerOf(nextBoxes[nodeId]));
    app.querySelectorAll(".tree-frame").forEach((frameElement) => {
      frameElement.classList.toggle("drop-target", frameElement.dataset.elementId === targetFrame.id);
    });
    for (const id of draggedNodeIds) updateDraggedNodeVisual(id, nextBoxes[id], nextBoxes);
  };

  const finish = async () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    app.querySelectorAll(".tree-frame.drop-target").forEach((frameElement) => frameElement.classList.remove("drop-target"));
    if (!dragging) return;
    element.dataset.dragged = "true";
    await moveNodesToFrame(draggedNodeIds, targetFrame?.id || rootFrameId(), nextBoxes);
  };

  element.addEventListener(
    "click",
    (clickEvent) => {
      if (element.dataset.dragged !== "true") return;
      clickEvent.preventDefault();
      clickEvent.stopImmediatePropagation();
      delete element.dataset.dragged;
    },
    { capture: true, once: true }
  );
  document.addEventListener("pointermove", move, { passive: false });
  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", finish);
};

const bindEvents = () => {
  app.querySelectorAll("[data-element-id]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      selectElement(element.dataset.elementId, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
    });
    if (element.dataset.elementType === "node") {
      element.addEventListener("pointerdown", (event) => beginNodeDrag(event, element));
      element.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        openNodePreview(element.dataset.elementId);
      });
    }
  });

  app.querySelectorAll("[data-node-field]").forEach((field) => {
    field.addEventListener("change", () => updateNode(field.dataset.id, field.dataset.nodeField, field.value));
  });

  app.querySelectorAll("[data-node-frame]").forEach((field) => {
    field.addEventListener("change", () => moveNodeToFrame(field.dataset.id, field.value));
  });

  app.querySelectorAll("[data-frame-field]").forEach((field) => {
    field.addEventListener("change", () => updateFrame(field.dataset.id, field.dataset.frameField, field.value || null));
  });

  app.querySelectorAll("[data-link-field]").forEach((field) => {
    field.addEventListener("change", () => updateLink(field.dataset.id, field.dataset.linkField, field.value));
  });

  app.querySelectorAll("[data-assumption-id]").forEach((field) => {
    field.addEventListener("change", () => updateAssumption(field.dataset.assumptionId, field.value));
  });

  app.querySelectorAll(".inspector input, .inspector textarea, .inspector select").forEach((field) => {
    field.addEventListener("focus", () => {
      beginInspectorEditing();
      updateViewState();
      setStatus("Editing selected element");
    });
  });

  app.querySelector("[data-layout-direction]")?.addEventListener("change", (event) => {
    updateLayoutDirection(event.target.value);
  });

  app.querySelector("[data-active-frame]")?.addEventListener("change", (event) => {
    setActiveFrame(event.target.value);
  });

  app.querySelectorAll("[data-promote-assumption]").forEach((button) => {
    button.addEventListener("click", () => promoteAssumption(button.dataset.promoteAssumption));
  });

  app.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const action = button.dataset.action;
      if (action === "close-node-preview" && button.classList.contains("node-preview-backdrop") && event.target !== button) return;
      if (action === "cancel-delete" && button.classList.contains("delete-backdrop") && event.target !== button) return;
      if (action === "layout") runAutoLayout();
      if (action === "undo") moveHistory("undo");
      if (action === "redo") moveHistory("redo");
      if (action === "export") exportMarkdown();
      if (action === "hints") toggleHints();
      if (action === "pin") togglePin();
      if (action === "add-assumption") addAssumptionToSelectedLink();
      if (action === "enter-frame") enterSelectedFrame();
      if (action === "open-node-preview") openNodePreview();
      if (action === "close-node-preview") closeNodePreview();
      if (action === "zoom-in") setZoom(zoomLevel + 0.1);
      if (action === "zoom-out") setZoom(zoomLevel - 0.1);
      if (action === "zoom-reset") resetZoom();
      if (action === "fit-view") fitView();
      if (action === "toggle-left-panel") togglePanel("left");
      if (action === "toggle-right-panel") togglePanel("right");
      if (action === "activate-root-frame") setActiveFrame(rootFrameId());
      if (action === "delete-selection") requestDeleteSelection();
      if (action === "cancel-delete") cancelContext();
      if (action === "confirm-delete") confirmDeletion();
    });
  });

  const canvasShell = app.querySelector(".canvas-shell");
  canvasShell?.addEventListener("scroll", () => {
    viewportState = { left: canvasShell.scrollLeft, top: canvasShell.scrollTop };
    viewportSize = { width: canvasShell.clientWidth, height: canvasShell.clientHeight };
    updateViewState();
    updateMinimapViewport();
    scheduleViewStatePersist();
  });

  const minimap = app.querySelector("[data-minimap-map]");
  const navigateFromMinimap = (event) => {
    const rect = minimap.getBoundingClientRect();
    const scale = Number(minimap.dataset.scale);
    const originX = Number(minimap.dataset.originX || 0);
    const originY = Number(minimap.dataset.originY || 0);
    const logicalPoint = {
      x: originX + (event.clientX - rect.left) / scale,
      y: originY + (event.clientY - rect.top) / scale
    };
    const shell = app.querySelector(".canvas-shell");
    setViewportPosition(
      logicalPoint.x * zoomLevel - shell.clientWidth / 2,
      logicalPoint.y * zoomLevel - shell.clientHeight / 2
    );
  };
  minimap?.addEventListener("pointerdown", (event) => {
    minimap.setPointerCapture(event.pointerId);
    navigateFromMinimap(event);
  });
  minimap?.addEventListener("pointermove", (event) => {
    if (minimap.hasPointerCapture(event.pointerId)) navigateFromMinimap(event);
  });

  const search = app.querySelector("[data-search]");
  search?.addEventListener("input", () => {
    searchText = search.value;
  });
};

const bindingMatchesEvent = (binding, event) => {
  const primaryPressed = event.metaKey || event.ctrlKey;
  if (binding.command) {
    if (!event.metaKey || event.ctrlKey) return false;
  } else if (binding.primary) {
    if (!primaryPressed) return false;
  } else if (binding.control) {
    if (!event.ctrlKey || event.metaKey) return false;
  } else if (primaryPressed) {
    return false;
  }
  if (Boolean(binding.alt) !== event.altKey) return false;
  if (Object.hasOwn(binding, "shift") && binding.shift !== event.shiftKey) return false;
  const expectedKey = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return expectedKey === eventKey;
};

const commandForEvent = (event) => {
  for (const [command, bindings] of Object.entries(commandBindings)) {
    if (bindings.some((binding) => bindingMatchesEvent(binding, event))) return command;
  }
  return null;
};

const executeCommand = (command) => {
  const commands = {
    commandPalette: () => setStatus("Command palette placeholder: use H, N, A, L, F, P, /"),
    showHints: toggleHints,
    toggleMultiSelect,
    moveSelectionToParent,
    chooseSelectionFrame: beginFrameTargetMode,
    createNode: createNodeInViewport,
    createParentNode: () => createNode(selectedNode()?.frameId || activeFrameId, "necessaryCondition", "New parent/above condition"),
    createSupportingNode,
    focusInspector: focusPrimaryEditor,
    beginConnection,
    createFrame,
    selectParentFrame,
    enterSelectedFrame,
    focusSearch: () => document.querySelector("[data-search]")?.focus(),
    togglePin,
    previewNode: toggleNodePreview,
    cancelContext: () => cancelContext({ clearSelection: true }),
    undo: () => moveHistory("undo"),
    redo: () => moveHistory("redo"),
    deleteSelection: requestDeleteSelection,
    panUp: () => panViewport(0, -80),
    panDown: () => panViewport(0, 80),
    panLeft: () => panViewport(-80, 0),
    panRight: () => panViewport(80, 0),
    centerSelection,
    zoomIn: () => setZoom(zoomLevel + 0.1),
    zoomOut: () => setZoom(zoomLevel - 0.1),
    resetZoom,
    fitView,
    toggleLeftPanel: () => togglePanel("left"),
    toggleRightPanel: () => togglePanel("right"),
    runAutoLayout
  };
  return commands[command]?.();
};

const handleKeydown = async (event) => {
  const target = event.target;
  const isTextField = target?.matches?.("input, textarea, select");
  const isInspectorField = Boolean(isTextField && target.closest?.(".inspector"));

  if (event.key === "Escape") {
    event.preventDefault();
    cancelContext();
    return;
  }

  if (deleteCandidateId && event.key === "Enter") {
    event.preventDefault();
    await confirmDeletion();
    return;
  }

  if (deleteCandidateId && event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "g") {
    event.preventDefault();
    cancelContext();
    return;
  }

  if (deleteCandidateId) return;

  if (previewNodeId && event.key === " ") {
    event.preventDefault();
    closeNodePreview();
    setStatus("Preview closed");
    return;
  }

  if (previewNodeId && event.key === "Enter") {
    event.preventDefault();
    closeNodePreview({ continueEditing: true });
    return;
  }

  const command = commandForEvent(event);
  if (command === "cancelContext") {
    event.preventDefault();
    executeCommand(command);
    return;
  }

  if (isInspectorField && event.key === "Enter") {
    if (event.shiftKey && target.matches("textarea")) return;
    event.preventDefault();
    await commitInspectorField(target);
    return;
  }

  if (isTextField) return;

  if (command === "showHints") {
    event.preventDefault();
    toggleHints();
    return;
  }

  if (command === "toggleMultiSelect") {
    event.preventDefault();
    toggleMultiSelect();
    return;
  }

  if (
    multiSelectionMode &&
    command === "beginConnection" &&
    [...selectionRootIds].some((id) => Boolean(nodeById()[id]))
  ) {
    event.preventDefault();
    beginConnection();
    return;
  }

  if (hintsVisible && !event.ctrlKey && !event.metaKey && !event.altKey && /^[a-z]$/i.test(event.key)) {
    event.preventDefault();
    handleHintKey(event.key);
    return;
  }

  if (command) {
    event.preventDefault();
    await executeCommand(command);
  }
};

document.addEventListener("keydown", handleKeydown);

const bootPromise = (async () => {
  [workspaceData, historyState, buildInfo] = await Promise.all([
    window.ltpPrototype.loadWorkspace(),
    window.ltpPrototype.getHistoryState(),
    window.ltpPrototype.getBuildInfo()
  ]);
  const activeTree = tree();
  const activeViewState = canvas().viewState || {};
  selectedElementId = activeViewState.selectedElementId || activeTree.nodes[0]?.id;
  selectionRootIds = new Set(
    activeViewState.selectionRootIds?.length
      ? activeViewState.selectionRootIds
      : selectedElementId
        ? [selectedElementId]
        : []
  );
  activeFrameId = activeViewState.activeFrameId || activeTree.hostFrameId;
  viewportState = {
    left: activeViewState.pan?.x || 0,
    top: activeViewState.pan?.y || 0
  };
  zoomLevel = clamp(activeViewState.zoom || 1, 0.35, 2.5);
  panelState = {
    leftOpen: activeViewState.panels?.leftOpen ?? true,
    rightOpen: activeViewState.panels?.rightOpen ?? true
  };
  rebuildSelection();
  statusText = "Prototype loaded";
  render();
})();

window.__ltpSmokeTest = async () => {
  await bootPromise;
  const waitFor = async (predicate, timeoutMs = 2000) => {
    const startedAt = Date.now();
    while (!predicate() && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return predicate();
  };
  workspaceData = await window.ltpPrototype.runLayout(workspaceData);
  const exportResult = await window.ltpPrototype.exportMarkdown(workspaceData);
  render();
  const activeTree = tree();
  const activeCanvas = canvas();
  const initialActiveFrameId = activeFrameId;
  const rootFrameIsConceptual =
    !document.querySelector(`[data-element-id="${activeCanvas.rootFrameId}"]`) &&
    document.querySelectorAll(".minimap-frame").length === activeCanvas.frames.length - 1;
  const buildIdentityVisible =
    document.querySelector(".build-identity")?.textContent === `v${buildInfo.version} | build ${buildInfo.id}`;
  const registryDrivesGoalTree =
    diagramDefinition().defaultDirection === "TB" &&
    diagramNodeTypes().map((type) => type.id).join(",") ===
      "goal,criticalSuccessFactor,necessaryCondition,assumption";
  const selectedTestFrame = activeCanvas.frames.find((frame) => frame.id === activeTree.hostFrameId);
  const expectedFrameSelection = new Set(
    window.LTP_SELECTION_MODEL.selectionClosure(activeTree, [selectedTestFrame.id], activeCanvas.frames)
  );
  await selectElement(selectedTestFrame.id);
  const semanticFrameSummaryVisible =
    document.querySelector(".frame-inventory")?.textContent.includes("Goal:") &&
    !document.querySelector(".canvas-status")?.textContent.includes("Included:");
  const frameSelectionIsTransitive =
    selectionIds.size === expectedFrameSelection.size &&
    [...expectedFrameSelection].every((id) => selectionIds.has(id));
  const frameSelectionIsDistinct =
    document.querySelector(`[data-element-id="${selectedTestFrame.id}"]`)?.classList.contains("selected") &&
    [...expectedFrameSelection]
      .filter((id) => id !== selectedTestFrame.id)
      .every((id) => {
        const element =
          document.querySelector(`[data-element-id="${id}"]`) ||
          document.querySelector(`[data-link-id="${id}"]`);
        return element?.classList.contains("selection-included");
      });
  const selectedFrameNodeIds = new Set(
    activeTree.nodes.filter((node) => selectionIds.has(node.id)).map((node) => node.id)
  );
  const externalLinksStayOutsideFrameSelection = activeTree.links
    .filter(
      (link) =>
        selectedFrameNodeIds.has(link.sourceNodeId) !== selectedFrameNodeIds.has(link.targetNodeId)
    )
    .every((link) => !selectionIds.has(link.id));
  connectionSourceIds.add(activeTree.nodes[0].id);
  const connectionSourcesStayIndependent =
    connectionSourceIds.has(activeTree.nodes[0].id) && selectionIds.has(selectedTestFrame.id);
  await selectElement(selectedTestFrame.id);
  const selectedFrameTogglesOff =
    selectionIds.size === 0 && selectionRootIds.size === 0 && activeFrameId === selectedTestFrame.id;
  connectionSourceIds.clear();
  const frameContextControlAvailable =
    document.querySelectorAll("[data-active-frame] option").length === activeCanvas.frames.length &&
    document.querySelector(`[data-active-frame] option[value="${activeCanvas.rootFrameId}"]`)?.textContent.includes("root") &&
    Boolean(document.querySelector("[data-action='activate-root-frame']"));
  replaceSelection(activeTree.nodes[0].id);
  toggleSelectionRoot(activeTree.nodes[1].id);
  beginConnection();
  const generalSelectionSeedsConnection =
    mode === "connection" &&
    connectionSourceIds.has(activeTree.nodes[0].id) &&
    connectionSourceIds.has(activeTree.nodes[1].id);
  cancelContext();
  activeFrameId = initialActiveFrameId;
  replaceSelection(activeCanvas.viewState?.selectedElementId || activeTree.nodes[0]?.id);
  render();
  hintEntries = visibleHintEntries();
  const stressHintLabels = generateHintLabels(40);
  const hintsArePrefixFree = stressHintLabels.every(
    (label, index) => !stressHintLabels.some((candidate, candidateIndex) => candidateIndex !== index && candidate.startsWith(label))
  );
  const initialSelection = selectedElementId;
  const initialNodeCount = activeTree.nodes.length;
  const twoLetterTarget = activeTree.nodes[1]?.id;
  hintEntries = stressHintLabels.map((hint, index) => ({
    id: index === 0 ? twoLetterTarget : activeTree.nodes[index % activeTree.nodes.length].id,
    type: "node",
    x: 0,
    y: 0,
    label: hint,
    hint
  }));
  hintsVisible = true;
  hintBuffer = "";
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
  const firstHintLetterWaits = hintBuffer === "A" && selectedElementId === initialSelection;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
  await Promise.resolve();
  const twoLetterHintWorks =
    firstHintLetterWaits && selectedElementId === twoLetterTarget && activeTree.nodes.length === initialNodeCount;
  replaceSelection(initialSelection);
  hintsVisible = false;
  hintBuffer = "";
  render();

  const hintToggleSelection = selectedElementId;
  focusCanvas();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true, cancelable: true }));
  const keyboardHintsOpen =
    hintsVisible && document.querySelector("[data-action='hints']")?.getAttribute("aria-pressed") === "true";
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true, cancelable: true }));
  const keyboardHintsToggle =
    keyboardHintsOpen && !hintsVisible && selectedElementId === hintToggleSelection && hintBuffer === "";

  document.querySelector("[data-action='hints']")?.click();
  const buttonHintsOpen =
    hintsVisible && document.querySelector("[data-action='hints']")?.classList.contains("is-active");
  hintBuffer = "A";
  document.querySelector("[data-action='hints']")?.click();
  const hintButtonToggles =
    buttonHintsOpen &&
    !hintsVisible &&
    hintBuffer === "" &&
    document.querySelector("[data-action='hints']")?.getAttribute("aria-pressed") === "false";
  replaceSelection(activeTree.nodes[0].id);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "m", bubbles: true, cancelable: true }));
  const multiSelectOpens = multiSelectionMode && hintsVisible;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "m", bubbles: true, cancelable: true }));
  const multiSelectToggles = multiSelectOpens && !multiSelectionMode && !hintsVisible;

  panelState.leftOpen = true;
  render();
  const shortcutDetails = document.querySelector(".shortcut-details");
  const allShortcutsListed =
    Boolean(shortcutDetails?.open) &&
    Object.entries(commandBindings).every(([command, bindings]) => {
      const row = document.querySelector(`[data-shortcut-command="${command}"]`);
      const displayedBindings = [...(row?.querySelectorAll("kbd") || [])].map((key) => key.textContent);
      return (
        row?.textContent.includes(commandLabels[command]) &&
        displayedBindings.length === bindings.length &&
        bindings.every((binding) => displayedBindings.includes(formatShortcutBinding(binding)))
      );
    });
  const commandAndControlBindingsStayDistinct =
    commandForEvent(new KeyboardEvent("keydown", { key: "p", metaKey: true })) === "moveSelectionToParent" &&
    commandForEvent(new KeyboardEvent("keydown", { key: "f", metaKey: true })) === "chooseSelectionFrame" &&
    commandForEvent(new KeyboardEvent("keydown", { key: "p", ctrlKey: true })) === "panUp" &&
    commandForEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true })) === "panRight";

  const initialShell = document.querySelector(".canvas-shell");
  initialShell.scrollLeft = Math.min(120, initialShell.scrollWidth - initialShell.clientWidth);
  initialShell.dispatchEvent(new Event("scroll"));
  const expectedScrollLeft = initialShell.scrollLeft;
  showHints();
  const viewportPreserved = expectedScrollLeft > 0 && document.querySelector(".canvas-shell").scrollLeft === expectedScrollLeft;
  hideHints();

  const firstLink = activeTree.links[0];
  const linkLine = document.querySelector(".tree-link-line");
  const targetBox = firstLink ? layoutNode(firstLink.targetNodeId) : null;
  const arrowEndsAtEdge =
    Boolean(linkLine && targetBox) &&
    linkLine.getAttribute("marker-end") === "url(#arrow)" &&
    (Number(linkLine.getAttribute("x2")) !== centerOf(targetBox).x ||
      Number(linkLine.getAttribute("y2")) !== centerOf(targetBox).y);

  openNodePreview(activeTree.nodes[0]?.id);
  const fullTextPreviewWorks = document.querySelector(".node-preview-dialog p")?.textContent === activeTree.nodes[0]?.statement;
  closeNodePreview();

  replaceSelection(tree().nodes[0]?.id);
  mode = "navigation";
  render();
  focusCanvas();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  const primaryEditor = document.activeElement;
  const enterStartsEditing = mode === "editing" && primaryEditor?.matches?.("[data-primary-editor]");
  const originalStatement = nodeById()[selectedElementId].statement;
  primaryEditor.value = `${originalStatement}\nSmoke test edit`;
  primaryEditor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
  const shiftEnterKeepsEditing = mode === "editing" && nodeById()[selectedElementId].statement === originalStatement;
  primaryEditor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  const enterCommitsEditing = await waitFor(
    () => mode === "navigation" && nodeById()[selectedElementId]?.statement.endsWith("Smoke test edit")
  );
  const undoButtonReady = historyState.canUndo && !document.querySelector("[data-action='undo']")?.disabled;
  await moveHistory("undo");
  const undoWorks =
    undoButtonReady &&
    nodeById()[selectedElementId]?.statement === originalStatement &&
    historyState.canRedo &&
    !document.querySelector("[data-action='redo']")?.disabled;
  await moveHistory("redo");
  const redoWorks =
    nodeById()[selectedElementId]?.statement.endsWith("Smoke test edit") &&
    historyState.canUndo &&
    !historyState.canRedo;

  panelState.rightOpen = false;
  mode = "navigation";
  render();
  focusCanvas();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  const closedInspectorOpensForEditing =
    panelState.rightOpen && mode === "editing" && document.activeElement?.matches?.("[data-primary-editor]");
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  const inspectorStateRestoredAfterEditing = await waitFor(() => mode === "navigation" && !panelState.rightOpen);
  panelState.rightOpen = true;
  render();

  focusCanvas();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
  const previewOpenedWithSpace = Boolean(previewNodeId);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
  const previewClosedWithSpace = !previewNodeId;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  const previewEnterContinuesEditing =
    !previewNodeId && mode === "editing" && document.activeElement?.matches?.("[data-primary-editor]");
  cancelContext();

  replaceSelection(tree().nodes[0]?.id);
  mode = "navigation";
  render();
  focusCanvas();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "g", ctrlKey: true, bubbles: true, cancelable: true }));
  const ctrlGClearsSelection = selectedElementId === null && mode === "navigation";

  const placementShell = document.querySelector(".canvas-shell");
  placementShell.scrollLeft = Math.min(140, placementShell.scrollWidth - placementShell.clientWidth);
  placementShell.dispatchEvent(new Event("scroll"));
  const placementViewportLeft = placementShell.scrollLeft;
  const placementViewportRight = placementViewportLeft + placementShell.clientWidth;
  const viewportNodeId = await createNodeInViewport();
  const viewportNodeBox = layoutNode(viewportNodeId);
  const secondViewportNodeId = await createNodeInViewport();
  const secondViewportNodeBox = layoutNode(secondViewportNodeId);
  const nodeCreatedInViewport =
    viewportNodeBox.x >= placementViewportLeft &&
    viewportNodeBox.x + viewportNodeBox.width <= placementViewportRight;
  const consecutiveNodesAreOffset =
    viewportNodeBox.x !== secondViewportNodeBox.x || viewportNodeBox.y !== secondViewportNodeBox.y;

  fitView();
  hideHints();
  const minimapRectBeforeZoom = document.querySelector(".minimap")?.getBoundingClientRect();
  const minimapViewportWidthBeforeZoom = Number.parseFloat(document.querySelector(".minimap-viewport")?.style.width || "0");
  const hiddenLinkOpacity = getComputedStyle(document.querySelector(".link-target")).opacity;
  showHints();
  const hintCountBeforeZoom = hintEntries.length;
  const hintBadgeHeightBeforeZoom = document.querySelector(".hint-badge")?.getBoundingClientRect().height;
  const visibleLinkOpacity = getComputedStyle(document.querySelector(".link-target")).opacity;
  setZoom(Math.min(1.25, zoomLevel + 0.4), { persist: false });
  const minimapRectAfterZoom = document.querySelector(".minimap")?.getBoundingClientRect();
  const minimapViewportWidthAfterZoom = Number.parseFloat(document.querySelector(".minimap-viewport")?.style.width || "0");
  const hintBadgeHeightAfterZoom = document.querySelector(".hint-badge")?.getBoundingClientRect().height;
  const hintsRemainUsableAfterZoom =
    hintCountBeforeZoom > 1 &&
    hintEntries.length > 1 &&
    document.querySelectorAll(".hint-badge").length === hintEntries.length &&
    hintBuffer === "" &&
    !statusText.includes("No hint matches");
  const hintBadgesKeepReadableSize =
    Math.abs(hintBadgeHeightBeforeZoom - hintBadgeHeightAfterZoom) < 1;
  const linkIndicatorsFollowHintMode = hiddenLinkOpacity === "0" && visibleLinkOpacity === "1";
  const minimapStaysAnchored =
    Math.abs(minimapRectBeforeZoom.right - minimapRectAfterZoom.right) < 1 &&
    Math.abs(minimapRectBeforeZoom.bottom - minimapRectAfterZoom.bottom) < 1;
  const minimapViewportScalesWithZoom =
    minimapViewportWidthAfterZoom < minimapViewportWidthBeforeZoom &&
    minimapViewportWidthBeforeZoom - minimapViewportWidthAfterZoom >= 12;
  hideHints();

  setZoom(1, { persist: false });
  const normalMinimapScale = Number(document.querySelector("[data-minimap-map]")?.dataset.scale || 0);
  setZoom(0.35, { persist: false });
  const farMinimap = document.querySelector("[data-minimap-map]");
  const farMinimapScale = Number(farMinimap?.dataset.scale || 0);
  const farDomainWidth = Number(farMinimap?.dataset.domainWidth || 0);
  const farDomainHeight = Number(farMinimap?.dataset.domainHeight || 0);
  const farCanvasSize = canvasSize();
  const minimapContentScalesWhenZoomedOut =
    (farDomainWidth > farCanvasSize.width || farDomainHeight > farCanvasSize.height) &&
    farMinimapScale < normalMinimapScale;

  setZoom(1.25, { persist: false });
  const zoomWorks =
    zoomLevel === 1.25 && document.querySelector(".canvas-content")?.style.transform === "scale(1.25)";
  const zoomAnchor = selectionCenter();
  const zoomShell = document.querySelector(".canvas-shell");
  const expectedZoomLeft = clamp(
    zoomAnchor.x * zoomLevel - zoomShell.clientWidth / 2,
    0,
    Math.max(0, zoomShell.scrollWidth - zoomShell.clientWidth)
  );
  const expectedZoomTop = clamp(
    zoomAnchor.y * zoomLevel - zoomShell.clientHeight / 2,
    0,
    Math.max(0, zoomShell.scrollHeight - zoomShell.clientHeight)
  );
  const zoomAnchorsSelection =
    Math.abs(zoomShell.scrollLeft - expectedZoomLeft) < 2 &&
    Math.abs(zoomShell.scrollTop - expectedZoomTop) < 2;
  setViewportPosition(0, 0, { persist: false });
  const panStart = document.querySelector(".canvas-shell").scrollLeft;
  focusCanvas();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
  const keyboardPanWorks = document.querySelector(".canvas-shell").scrollLeft > panStart;
  setViewportPosition(0, 0, { persist: false });
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true, cancelable: true })
  );
  const alternativeKeyboardPanWorks = document.querySelector(".canvas-shell").scrollLeft > 0;
  const minimapViewportBefore = document.querySelector(".minimap-viewport")?.style.left;
  panViewport(80, 0);
  const minimapWorks =
    Boolean(document.querySelector("[data-minimap-map]")) &&
    document.querySelector(".minimap-viewport")?.style.left !== minimapViewportBefore;
  fitView();
  const fitViewWorks = zoomLevel <= 1 && viewportState.left === 0 && viewportState.top === 0;
  setZoom(1, { persist: false });

  togglePanel("left");
  const leftPanelCollapses =
    !panelState.leftOpen && document.querySelector(".prototype-shell")?.classList.contains("left-collapsed");
  togglePanel("left");
  togglePanel("right");

  const directionTestTree = tree();
  directionTestTree.layout.direction = "LR";
  const leftToRightWorkspace = await window.ltpPrototype.runLayout(workspaceData);
  const leftToRightTree = leftToRightWorkspace.trees[0];
  const directionTestLink = leftToRightTree.links[0];
  const directionSource = leftToRightTree.layout.nodes[directionTestLink.sourceNodeId];
  const directionTarget = leftToRightTree.layout.nodes[directionTestLink.targetNodeId];
  const diagramDirectionIsAdjustable =
    leftToRightTree.layout.direction === "LR" &&
    directionSource.x + directionSource.width / 2 < directionTarget.x + directionTarget.width / 2;
  workspaceData = leftToRightWorkspace;
  tree().layout.direction = "TB";
  workspaceData = await window.ltpPrototype.runLayout(workspaceData);
  render();

  const animationNode = tree().nodes.find((node) => !layoutNode(node.id).pinned);
  const animationBox = tree().layout.nodes[animationNode.id];
  animationBox.x += 260;
  animationBox.y += 110;
  const animationStart = { x: animationBox.x, y: animationBox.y };
  await runAutoLayout();
  const animationEnd = layoutNode(animationNode.id);
  const animatedLayoutWorks =
    layoutAnimationMovedElements > 0 &&
    layoutAnimationFrameCount > 2 &&
    layoutAnimationConnectionsTracked &&
    (Math.abs(animationStart.x - animationEnd.x) > 1 || Math.abs(animationStart.y - animationEnd.y) > 1);
  const rightPanelCollapses =
    !panelState.rightOpen && document.querySelector(".prototype-shell")?.classList.contains("right-collapsed");
  togglePanel("right");

  const linkSourceId = viewportNodeId;
  const linkTargetId = secondViewportNodeId;
  const temporaryLinkId = await createLink(linkSourceId, linkTargetId);
  await addAssumptionToSelectedLink();
  const temporaryAssumptionId = selectedLink()?.assumptionIds.at(-1);
  requestDeleteSelection(temporaryLinkId);
  const deleteConfirmationWorks = Boolean(document.querySelector(".delete-dialog"));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "g", ctrlKey: true, bubbles: true, cancelable: true }));
  const deleteCancellationWorks = !deleteCandidateId && Boolean(linkById()[temporaryLinkId]);
  requestDeleteSelection(temporaryLinkId);
  await confirmDeletion();
  const linkDeletionCleansReferences =
    !linkById()[temporaryLinkId] &&
    !tree().assumptions.some((assumption) => assumption.id === temporaryAssumptionId) &&
    !tree().layout.links[temporaryLinkId];

  const cascadeSourceId = await createNodeInViewport();
  const cascadeTargetId = await createNodeInViewport();
  const cascadeLinkId = await createLink(cascadeSourceId, cascadeTargetId);
  await addAssumptionToSelectedLink();
  const cascadeAssumptionId = selectedLink()?.assumptionIds.at(-1);
  requestDeleteSelection(cascadeSourceId);
  await confirmDeletion();
  const nodeDeletionCascades =
    !nodeById()[cascadeSourceId] &&
    !linkById()[cascadeLinkId] &&
    !tree().assumptions.some((assumption) => assumption.id === cascadeAssumptionId) &&
    !tree().layout.nodes[cascadeSourceId] &&
    canvas().frames.every((frame) => !frame.nodeIds.includes(cascadeSourceId));
  requestDeleteSelection(cascadeTargetId);
  await confirmDeletion();

  await createFrame();
  const temporaryFrameId = selectedElementId;
  const frameNodeId = await createNode(temporaryFrameId, "necessaryCondition", "Temporary frame node");
  const companionFrameNodeId = await createNode(temporaryFrameId, "necessaryCondition", "Companion frame node");
  const frameLinkId = await createLink(frameNodeId, tree().nodes[0].id);
  const linkCountBeforeFrameMove = tree().links.length;
  replaceSelection(frameNodeId);
  toggleSelectionRoot(companionFrameNodeId);
  const dragElement = document.querySelector(`[data-element-id="${frameNodeId}"]`);
  const dragStartBox = { ...layoutNode(frameNodeId) };
  const companionStartBox = { ...layoutNode(companionFrameNodeId) };
  const dragTarget = { x: 12, y: 12 };
  const dragStart = { x: 120, y: 120 };
  dragElement.dispatchEvent(
    new PointerEvent("pointerdown", {
      button: 0,
      clientX: dragStart.x,
      clientY: dragStart.y,
      bubbles: true,
      cancelable: true
    })
  );
  document.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: dragStart.x + (dragTarget.x - centerOf(dragStartBox).x) * zoomLevel,
      clientY: dragStart.y + (dragTarget.y - centerOf(dragStartBox).y) * zoomLevel,
      bubbles: true,
      cancelable: true
    })
  );
  document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
  await waitFor(
    () =>
      nodeById()[frameNodeId]?.frameId === rootFrameId() &&
      nodeById()[companionFrameNodeId]?.frameId === rootFrameId()
  );
  const entityCanLeaveFrame =
    nodeById()[frameNodeId].frameId === rootFrameId() &&
    frameById()[rootFrameId()].nodeIds.includes(frameNodeId) &&
    !frameById()[temporaryFrameId].nodeIds.includes(frameNodeId);
  const groupDragPreservesSelection =
    frameById()[rootFrameId()].nodeIds.includes(companionFrameNodeId) &&
    Math.abs(
      (layoutNode(companionFrameNodeId).x - layoutNode(frameNodeId).x) -
        (companionStartBox.x - dragStartBox.x)
    ) < 1;
  await moveNodesToFrame([frameNodeId, companionFrameNodeId], temporaryFrameId);
  const entityCanEnterFrame =
    nodeById()[frameNodeId].frameId === temporaryFrameId &&
    nodeById()[companionFrameNodeId].frameId === temporaryFrameId &&
    frameById()[temporaryFrameId].nodeIds.includes(frameNodeId) &&
    tree().links.length === linkCountBeforeFrameMove &&
    Boolean(linkById()[frameLinkId]);
  requestDeleteSelection(temporaryFrameId);
  await confirmDeletion();
  const frameDeletionCascades =
    !frameById()[temporaryFrameId] &&
    !nodeById()[frameNodeId] &&
    !nodeById()[companionFrameNodeId] &&
    !linkById()[frameLinkId] &&
    !canvas().layout.frames[temporaryFrameId] &&
    !tree().layout.nodes[frameNodeId] &&
    canvas().frames.every((frame) => !frame.childFrameIds.includes(temporaryFrameId));
  requestDeleteSelection(rootFrameId());
  const rootFrameIsProtected = deleteCandidateId === null && Boolean(frameById()[rootFrameId()]);

  hintEntries = visibleHintEntries();
  const finalTree = tree();
  const finalCanvas = canvas();

  return {
    ok:
      Boolean(workspaceData) &&
      finalTree.nodes.length >= 10 &&
      finalCanvas.frames.length >= 5 &&
      finalTree.links.length >= 6 &&
      hintEntries.length > 0 &&
      document.querySelectorAll(".tree-node").length >= 10 &&
      document.querySelectorAll(".tree-frame").length === finalCanvas.frames.length - 1 &&
      document.querySelectorAll(".link-target").length >= 6 &&
      hintsArePrefixFree &&
      buildIdentityVisible &&
      rootFrameIsConceptual &&
      registryDrivesGoalTree &&
      frameSelectionIsTransitive &&
      frameSelectionIsDistinct &&
      externalLinksStayOutsideFrameSelection &&
      connectionSourcesStayIndependent &&
      selectedFrameTogglesOff &&
      frameContextControlAvailable &&
      semanticFrameSummaryVisible &&
      generalSelectionSeedsConnection &&
      twoLetterHintWorks &&
      keyboardHintsToggle &&
      hintButtonToggles &&
      multiSelectToggles &&
      allShortcutsListed &&
      commandAndControlBindingsStayDistinct &&
      viewportPreserved &&
      arrowEndsAtEdge &&
      fullTextPreviewWorks &&
      enterStartsEditing &&
      shiftEnterKeepsEditing &&
      enterCommitsEditing &&
      undoWorks &&
      redoWorks &&
      closedInspectorOpensForEditing &&
      inspectorStateRestoredAfterEditing &&
      previewOpenedWithSpace &&
      previewClosedWithSpace &&
      previewEnterContinuesEditing &&
      ctrlGClearsSelection &&
      nodeCreatedInViewport &&
      consecutiveNodesAreOffset &&
      hintsRemainUsableAfterZoom &&
      hintBadgesKeepReadableSize &&
      linkIndicatorsFollowHintMode &&
      minimapStaysAnchored &&
      minimapViewportScalesWithZoom &&
      minimapContentScalesWhenZoomedOut &&
      zoomWorks &&
      zoomAnchorsSelection &&
      keyboardPanWorks &&
      alternativeKeyboardPanWorks &&
      minimapWorks &&
      fitViewWorks &&
      leftPanelCollapses &&
      rightPanelCollapses &&
      diagramDirectionIsAdjustable &&
      animatedLayoutWorks &&
      deleteConfirmationWorks &&
      deleteCancellationWorks &&
      linkDeletionCleansReferences &&
      nodeDeletionCascades &&
      frameDeletionCascades &&
      entityCanLeaveFrame &&
      entityCanEnterFrame &&
      groupDragPreservesSelection &&
      rootFrameIsProtected &&
      Object.keys(commandBindings).length >= 10 &&
      Boolean(exportResult.path),
    nodes: finalTree.nodes.length,
    frames: finalCanvas.frames.length,
    links: finalTree.links.length,
    hints: hintEntries.length,
    hintsArePrefixFree,
    buildIdentityVisible,
    rootFrameIsConceptual,
    registryDrivesGoalTree,
    frameSelectionIsTransitive,
    frameSelectionIsDistinct,
    externalLinksStayOutsideFrameSelection,
    connectionSourcesStayIndependent,
    selectedFrameTogglesOff,
    frameContextControlAvailable,
    semanticFrameSummaryVisible,
    generalSelectionSeedsConnection,
    twoLetterHintWorks,
    keyboardHintsToggle,
    hintButtonToggles,
    multiSelectToggles,
    allShortcutsListed,
    commandAndControlBindingsStayDistinct,
    viewportPreserved,
    arrowEndsAtEdge,
    fullTextPreviewWorks,
    enterStartsEditing,
    shiftEnterKeepsEditing,
    enterCommitsEditing,
    undoWorks,
    redoWorks,
    closedInspectorOpensForEditing,
    inspectorStateRestoredAfterEditing,
    previewOpenedWithSpace,
    previewClosedWithSpace,
    previewEnterContinuesEditing,
    ctrlGClearsSelection,
    nodeCreatedInViewport,
    consecutiveNodesAreOffset,
    hintsRemainUsableAfterZoom,
    hintBadgesKeepReadableSize,
    linkIndicatorsFollowHintMode,
    minimapStaysAnchored,
    minimapViewportScalesWithZoom,
    minimapContentScalesWhenZoomedOut,
    zoomWorks,
    zoomAnchorsSelection,
    keyboardPanWorks,
    alternativeKeyboardPanWorks,
    minimapWorks,
    fitViewWorks,
    leftPanelCollapses,
    rightPanelCollapses,
    diagramDirectionIsAdjustable,
    animatedLayoutWorks,
    deleteConfirmationWorks,
    deleteCancellationWorks,
    linkDeletionCleansReferences,
    nodeDeletionCascades,
    frameDeletionCascades,
    entityCanLeaveFrame,
    entityCanEnterFrame,
    groupDragPreservesSelection,
    rootFrameIsProtected,
    exportPath: exportResult.path
  };
};

window.__ltpVisualTestStep = async (step) => {
  await bootPromise;
  await workspaceOperationQueue;
  const activeTree = tree();
  const activeCanvas = canvas();
  const result = (title, ok, detail) => ({ title, ok: Boolean(ok), detail });
  const waitFor = async (predicate, timeoutMs = 2500) => {
    const startedAt = Date.now();
    while (!predicate() && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return predicate();
  };
  const pressKey = async (key, options = {}) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };
  const chooseHintTarget = async (id) => {
    const hint = hintEntries.find((entry) => entry.id === id)?.hint;
    if (!hint) return false;
    for (const key of hint) await pressKey(key);
    return true;
  };

  if (step === "baseline") {
    multiSelectionMode = false;
    connectionSourceIds.clear();
    hintsVisible = false;
    activeFrameId = activeTree.hostFrameId;
    replaceSelection(null);
    setStatus("Visual check: canvas and build identity");
    render();
    fitView();
    const hostVisible = Boolean(document.querySelector(`[data-element-id="${activeTree.hostFrameId}"]`));
    const rootHidden = !document.querySelector(`[data-element-id="${activeCanvas.rootFrameId}"]`);
    return result("Build identity and composed canvas", buildInfo.id === "3B.3" && hostVisible && rootHidden, "Build 3B.3 is visible; Goal Tree is finite and Root remains conceptual.");
  }

  if (step === "frame-summary") {
    await selectElement(activeTree.hostFrameId);
    fitView();
    const summary = document.querySelector(".frame-inventory")?.textContent || "";
    const ok = ["Goal:", "CSF:", "NC:", "Frames:", "Links:"].every((label) => summary.includes(label));
    return result("Semantic Goal Tree summary", ok, "Selecting Goal Tree exposes type, frame and internal-link counts.");
  }

  if (step === "entity-frame-target-open") {
    const sourceFrame = activeCanvas.frames.find((frame) => frame.treeId === activeTree.id && frame.nodeIds.length >= 3);
    const nodeId = sourceFrame?.nodeIds[0];
    visualTestState.keyboardNodeId = nodeId;
    visualTestState.keyboardNodeOriginalFrameId = sourceFrame?.id;
    replaceSelection(nodeId);
    await pressKey("f", { metaKey: true });
    const rootHintVisible = hintEntries.some((entry) => entry.id === rootFrameId());
    const onlyFrames = hintEntries.length > 0 && hintEntries.every((entry) => entry.type === "frame");
    return result("Choose an entity destination with Cmd+F", mode === "frame-target" && rootHintVisible && onlyFrames, "Cmd+F shows only valid frames and includes the conceptual ROOT target.");
  }

  if (step === "entity-moved-to-root") {
    const targetChosen = await chooseHintTarget(rootFrameId());
    const moved = await waitFor(() => nodeById()[visualTestState.keyboardNodeId]?.frameId === rootFrameId());
    return result("Move an entity to ROOT by hint", targetChosen && moved && mode === "navigation", "Typing ROOT's hint moves the selected entity without using the mouse.");
  }

  if (step === "entity-moved-to-parent") {
    await moveSelectionToFrame(visualTestState.keyboardNodeOriginalFrameId);
    const expectedParentId = frameById()[visualTestState.keyboardNodeOriginalFrameId]?.parentFrameId;
    await pressKey("p", { metaKey: true });
    const moved = await waitFor(() => nodeById()[visualTestState.keyboardNodeId]?.frameId === expectedParentId);
    return result("Move an entity to its parent with Cmd+P", moved, "Cmd+P moves the explicitly selected entity one frame level upward.");
  }

  if (step === "frame-target-open") {
    const sourceFrame = activeCanvas.frames.find(
      (frame) => frame.parentFrameId === activeTree.hostFrameId && frame.childFrameIds.length === 0
    );
    const targetFrame = activeCanvas.frames.find(
      (frame) => frame.parentFrameId === activeTree.hostFrameId && frame.id !== sourceFrame?.id
    );
    visualTestState.keyboardFrameId = sourceFrame?.id;
    visualTestState.keyboardFrameOriginalParentId = sourceFrame?.parentFrameId;
    visualTestState.keyboardFrameTargetId = targetFrame?.id;
    replaceSelection(sourceFrame?.id);
    await pressKey("f", { metaKey: true });
    const excludesCycleTargets = !hintEntries.some((entry) => entry.id === sourceFrame?.id);
    const targetAvailable = hintEntries.some((entry) => entry.id === targetFrame?.id);
    return result("Choose a frame destination with Cmd+F", mode === "frame-target" && excludesCycleTargets && targetAvailable, "Frame hints exclude the selected frame and its descendants, preventing hierarchy cycles.");
  }

  if (step === "frame-moved-inside-frame") {
    const targetChosen = await chooseHintTarget(visualTestState.keyboardFrameTargetId);
    const moved = await waitFor(
      () => frameById()[visualTestState.keyboardFrameId]?.parentFrameId === visualTestState.keyboardFrameTargetId
    );
    return result("Move a frame by keyboard hint", targetChosen && moved, "Typing a frame hint reparents the selected frame while preserving its subtree.");
  }

  if (step === "frame-moved-to-parent") {
    await pressKey("p", { metaKey: true });
    const moved = await waitFor(
      () => frameById()[visualTestState.keyboardFrameId]?.parentFrameId === visualTestState.keyboardFrameOriginalParentId
    );
    return result("Move a frame to its parent with Cmd+P", moved, "Cmd+P lifts the selected frame one level and keeps its contents attached.");
  }

  if (step === "frame-parent-undo") {
    await pressKey("z", { metaKey: true });
    const undone = await waitFor(
      () => frameById()[visualTestState.keyboardFrameId]?.parentFrameId === visualTestState.keyboardFrameTargetId
    );
    return result("Undo keyboard frame movement", undone, "One Cmd+Z restores the complete frame subtree to its previous parent.");
  }

  if (step === "frame-parent-redo") {
    await pressKey("z", { metaKey: true, shiftKey: true });
    const redone = await waitFor(
      () => frameById()[visualTestState.keyboardFrameId]?.parentFrameId === visualTestState.keyboardFrameOriginalParentId
    );
    return result("Redo keyboard frame movement", redone, "One Cmd+Shift+Z reapplies the complete frame movement.");
  }

  if (step === "composed-layout-setup") {
    const hostFrameId = activeTree.hostFrameId;
    const rootNodeId = visualTestState.keyboardNodeId;
    const nestedFrame = activeCanvas.frames.find(
      (frame) => frame.parentFrameId === hostFrameId && frame.id !== visualTestState.keyboardFrameId
    );
    const targetFrame = activeCanvas.frames.find(
      (frame) => frame.parentFrameId === hostFrameId && frame.id !== visualTestState.keyboardFrameId && frame.id !== nestedFrame?.id
    );
    visualTestState.composedRootNodeId = rootNodeId;
    visualTestState.composedNestedFrameId = nestedFrame?.id;
    visualTestState.composedTargetFrameId = targetFrame?.id;

    replaceSelection(hostFrameId);
    if (!layoutFrame(hostFrameId).pinned) await pressKey("p");
    visualTestState.composedPinnedFramePosition = { x: layoutFrame(hostFrameId).x, y: layoutFrame(hostFrameId).y };

    replaceSelection(rootNodeId);
    await pressKey("f", { metaKey: true });
    await chooseHintTarget(rootFrameId());
    await waitFor(() => nodeById()[rootNodeId]?.frameId === rootFrameId());

    replaceSelection(nestedFrame?.id);
    await pressKey("f", { metaKey: true });
    await chooseHintTarget(targetFrame?.id);
    await waitFor(() => frameById()[nestedFrame?.id]?.parentFrameId === targetFrame?.id);

    visualTestState.composedPreLayout = {
      nodes: structuredClone(activeTree.layout.nodes),
      frames: structuredClone(activeCanvas.layout.frames)
    };
    const logicalSetup =
      nodeById()[rootNodeId]?.frameId === rootFrameId() &&
      frameById()[nestedFrame?.id]?.parentFrameId === targetFrame?.id &&
      layoutFrame(hostFrameId).pinned;
    setStatus("Composed layout setup: hierarchy changed, geometry pending");
    render();
    return result("Prepare a composed hierarchy", logicalSetup, "A node is moved to ROOT, one frame is nested in a sibling, and the host frame is pinned.");
  }

  if (step === "composed-layout-applied") {
    await runAutoLayout();
    const issues = await window.ltpPrototype.validateLayout(workspaceData);
    const hostBox = layoutFrame(activeTree.hostFrameId);
    const nestedBox = layoutFrame(visualTestState.composedNestedFrameId);
    const targetBox = layoutFrame(visualTestState.composedTargetFrameId);
    const rootNodeBox = layoutNode(visualTestState.composedRootNodeId);
    const pinned = visualTestState.composedPinnedFramePosition;
    const nestedContained =
      nestedBox.x >= targetBox.x &&
      nestedBox.y >= targetBox.y &&
      nestedBox.x + nestedBox.width <= targetBox.x + targetBox.width &&
      nestedBox.y + nestedBox.height <= targetBox.y + targetBox.height;
    const rootNodeOutsideHost =
      rootNodeBox.x + rootNodeBox.width <= hostBox.x ||
      rootNodeBox.x >= hostBox.x + hostBox.width ||
      rootNodeBox.y + rootNodeBox.height <= hostBox.y ||
      rootNodeBox.y >= hostBox.y + hostBox.height;
    const routedPaths = document.querySelectorAll("path.tree-link-line").length === activeTree.links.length;
    const ok =
      issues.length === 0 &&
      nestedContained &&
      rootNodeOutsideHost &&
      hostBox.x === pinned.x &&
      hostBox.y === pinned.y &&
      layoutAnimationFrameCount > 2 &&
      routedPaths;
    fitView();
    return result("Apply composed auto-layout", ok, `Geometry issues: ${issues.length}; nested=${nestedContained}; rootOutside=${rootNodeOutsideHost}; animated=${layoutAnimationFrameCount > 2}; routed=${routedPaths}.`);
  }

  if (step === "composed-layout-undo") {
    await pressKey("z", { metaKey: true });
    const completed = await waitFor(() => statusText.startsWith("Undid: Apply layout") && !layoutAnimating, 2500);
    const previous = visualTestState.composedPreLayout;
    const restored =
      JSON.stringify(activeTree.layout.nodes) === JSON.stringify(previous.nodes) &&
      JSON.stringify(activeCanvas.layout.frames) === JSON.stringify(previous.frames);
    fitView();
    return result("Undo composed layout with transition", completed && restored && layoutAnimationFrameCount > 2, "Undo restores the complete pre-layout geometry and animates the return.");
  }

  if (step === "composed-layout-redo") {
    await pressKey("z", { metaKey: true, shiftKey: true });
    const completed = await waitFor(() => statusText.startsWith("Redid: Apply layout") && !layoutAnimating, 2500);
    const issues = await window.ltpPrototype.validateLayout(workspaceData);
    fitView();
    return result("Redo composed layout with transition", completed && issues.length === 0 && layoutAnimationFrameCount > 2, "Redo reapplies valid composed geometry and animates the movement.");
  }

  if (step === "multi-open") {
    const sourceFrame = activeCanvas.frames.find((frame) => frame.treeId === activeTree.id && frame.nodeIds.length >= 3);
    const targetFrame = activeCanvas.frames.find(
      (frame) =>
        frame.treeId === activeTree.id &&
        frame.id !== sourceFrame?.id &&
        frame.parentFrameId === sourceFrame?.parentFrameId &&
        frame.nodeIds.length > 0
    );
    const nodeIds = sourceFrame?.nodeIds.slice(0, 3) || [];
    visualTestState = {
      sourceFrameId: sourceFrame?.id,
      targetFrameId: targetFrame?.id,
      nodeIds,
      originalPositions: Object.fromEntries(nodeIds.map((id) => [id, { ...layoutNode(id) }]))
    };
    replaceSelection(nodeIds[0]);
    toggleMultiSelect();
    fitView();
    return result("Open keyboard multi-selection", multiSelectionMode && hintsVisible && hintEntries.length > 0, "M opens hints while preserving the first selected node.");
  }

  if (step === "multi-selected") {
    for (const id of visualTestState.nodeIds.slice(1)) await selectElement(id);
    const allSelected = visualTestState.nodeIds.every((id) => selectionRootIds.has(id));
    return result("Select three nodes by hints", allSelected && multiSelectionMode && hintsVisible, "All three nodes are explicit members of the general selection.");
  }

  if (step === "multi-closed") {
    toggleMultiSelect();
    const retained = visualTestState.nodeIds.every((id) => selectionRootIds.has(id));
    return result("Close multi-selection with M", retained && !multiSelectionMode && !hintsVisible, "The second M hides hints without clearing the selected group.");
  }

  if (step === "group-moved") {
    const draggedId = visualTestState.nodeIds[0];
    const draggedElement = document.querySelector(`[data-element-id="${draggedId}"]`);
    const startBox = layoutNode(draggedId);
    const targetBox = layoutFrame(visualTestState.targetFrameId);
    const destination = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + Math.min(100, targetBox.height / 2) };
    const startPointer = { x: 320, y: 280 };
    draggedElement.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: startPointer.x, clientY: startPointer.y, bubbles: true, cancelable: true }));
    document.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: startPointer.x + (destination.x - centerOf(startBox).x) * zoomLevel,
        clientY: startPointer.y + (destination.y - centerOf(startBox).y) * zoomLevel,
        bubbles: true,
        cancelable: true
      })
    );
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    const moved = await waitFor(() =>
      visualTestState.nodeIds.every((id) => nodeById()[id]?.frameId === visualTestState.targetFrameId)
    );
    const [firstId, secondId] = visualTestState.nodeIds;
    const relativePositionPreserved =
      Math.abs(
        (layoutNode(secondId).x - layoutNode(firstId).x) -
          (visualTestState.originalPositions[secondId].x - visualTestState.originalPositions[firstId].x)
      ) < 1;
    const targetFrameBox = layoutFrame(visualTestState.targetFrameId);
    const movedBoxes = visualTestState.nodeIds.map((id) => layoutNode(id));
    const stationaryBoxes = activeTree.nodes
      .filter(
        (node) =>
          node.frameId === visualTestState.targetFrameId && !visualTestState.nodeIds.includes(node.id)
      )
      .map((node) => layoutNode(node.id));
    const overlaps = (left, right) =>
      left.x < right.x + right.width &&
      left.x + left.width > right.x &&
      left.y < right.y + right.height &&
      left.y + left.height > right.y;
    const contained = movedBoxes.every(
      (box) =>
        box.x >= targetFrameBox.x &&
        box.y >= targetFrameBox.y &&
        box.x + box.width <= targetFrameBox.x + targetFrameBox.width &&
        box.y + box.height <= targetFrameBox.y + targetFrameBox.height
    );
    const collisionFree = movedBoxes.every((box) => stationaryBoxes.every((stationary) => !overlaps(box, stationary)));
    const geometryIssues = await window.ltpPrototype.validateLayout(workspaceData);
    const structuralIssues = geometryIssues.filter((issue) => !issue.code.startsWith("LINK_"));
    const ok = moved && relativePositionPreserved && contained && collisionFree && structuralIssues.length === 0;
    return result(
      "Drag the selected group",
      ok,
      ok
        ? "The group moves in one transaction, preserves relative positions and fits without collisions."
        : `Functional move passed, but geometry failed: contained=${contained}, collisionFree=${collisionFree}, issues=${structuralIssues.length}.`
    );
  }

  if (step === "group-undo") {
    await moveHistory("undo");
    const restored = visualTestState.nodeIds.every((id) => nodeById()[id]?.frameId === visualTestState.sourceFrameId);
    return result("Undo collective movement", restored, "One Cmd+Z-equivalent operation returns the complete group to its source frame.");
  }

  if (step === "group-redo") {
    await moveHistory("redo");
    const restored = visualTestState.nodeIds.every((id) => nodeById()[id]?.frameId === visualTestState.targetFrameId);
    return result("Redo collective movement", restored, "One redo operation moves the complete group back to the destination frame.");
  }

  if (step === "multi-connect") {
    const targetId = activeTree.nodes.find(
      (node) =>
        !visualTestState.nodeIds.includes(node.id) &&
        !activeTree.links.some(
          (link) => visualTestState.nodeIds.includes(link.sourceNodeId) && link.targetNodeId === node.id
        )
    )?.id;
    const before = activeTree.links.length;
    beginConnection();
    await selectElement(targetId);
    const created = activeTree.links.length - before;
    return result("Connect the general selection", created === visualTestState.nodeIds.length, "L converts the selected nodes into link sources and creates one link per source.");
  }

  if (step === "readable-routing") {
    const previousRevision = workspaceData.revision;
    workspaceData = await window.ltpPrototype.loadComplexGoalTreeFixture();
    workspaceData.revision = previousRevision;
    const complexTree = tree();
    const hostFrame = frameById()[complexTree.hostFrameId];
    activeFrameId = hostFrame.id;
    multiSelectionMode = false;
    connectionSourceIds.clear();
    hintsVisible = false;
    replaceSelection(hostFrame.id);
    await persist("Load complex Goal Tree visual fixture");
    await runAutoLayout();
    const issues = await window.ltpPrototype.validateLayout(workspaceData);
    const laidOutTree = tree();
    const goal = laidOutTree.nodes.find((node) => node.type === "goal");
    const csfIds = new Set(
      laidOutTree.nodes.filter((node) => node.type === "criticalSuccessFactor").map((node) => node.id)
    );
    const csfGoalLinks = laidOutTree.links.filter(
      (link) => csfIds.has(link.sourceNodeId) && link.targetNodeId === goal.id
    );
    const csfRows = new Set([...csfIds].map((nodeId) => layoutNode(nodeId).y));
    const goalArrivals = csfGoalLinks.map((link) => laidOutTree.layout.links[link.id].route.at(-1));
    const distinctArrivals = new Set(goalArrivals.map((point) => `${point.x}:${point.y}`)).size;
    const goalBox = layoutNode(goal.id);
    const enterGoalEdge = goalArrivals.every((point) => point.y === goalBox.y + goalBox.height);
    replaceSelection(goal.id);
    render();
    const arrowMarkersVisible = csfGoalLinks.every(
      (link) => document.querySelector(`[data-link-id="${link.id}"]`)?.getAttribute("marker-end") === "url(#arrow)"
    );
    const arrowMarkerScreenWidth = Number(document.querySelector("#arrow")?.getAttribute("markerWidth")) * zoomLevel;
    const arrowMarkersStayReadable = arrowMarkerScreenWidth >= 10;
    const quality = laidOutTree.layout.quality;
    const mostlyStraight = quality.straightRoutes >= laidOutTree.links.length - 2;
    const frameContainsDiagram = issues.length === 0;
    fitView();
    return result(
      "Lay out the permanent complex Goal Tree fixture",
      laidOutTree.nodes.length === 18 &&
        laidOutTree.links.length === 21 &&
        csfGoalLinks.length === 3 &&
        csfRows.size === 1 &&
        distinctArrivals === 3 &&
        enterGoalEdge &&
        arrowMarkersVisible &&
        arrowMarkersStayReadable &&
        quality.crossings === 0 &&
        mostlyStraight &&
        frameContainsDiagram,
      `18 entities, 21 links, CSF to Goal=${csfGoalLinks.length}, CSF layers=${csfRows.size}, distinct arrow arrivals=${distinctArrivals}, visible arrow markers=${arrowMarkersVisible}, arrow width=${arrowMarkerScreenWidth.toFixed(1)}px, crossings=${quality.crossings}, straight=${quality.straightRoutes}, bends=${quality.bends}, geometry issues=${issues.length}.`
    );
  }

  return result(`Unknown step: ${step}`, false, "The requested visual test step is not registered.");
};
