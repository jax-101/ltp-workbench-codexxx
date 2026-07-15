let workspaceData = null;
let selectedElementId = null;
let selectedElementType = "node";
let selectedElementIds = new Set();
let multiSelectMode = false;
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
let historyState = { canUndo: false, canRedo: false, undoLabel: null, redoLabel: null, revision: 0 };
let workspaceOperationQueue = Promise.resolve();

const app = document.querySelector("#app");
const hintAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".replace("H", "");
const commandBindings = window.LTP_COMMAND_BINDINGS || {};
const commandLabels = window.LTP_COMMAND_LABELS || {};

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();
const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const tree = () => workspaceData?.trees?.[0];
const system = () => workspaceData?.systems?.[0];
const nodeById = () => Object.fromEntries((tree()?.nodes || []).map((node) => [node.id, node]));
const frameById = () => Object.fromEntries((tree()?.frames || []).map((frame) => [frame.id, frame]));
const linkById = () => Object.fromEntries((tree()?.links || []).map((link) => [link.id, link]));
const selectedNode = () => nodeById()[selectedElementId];
const selectedFrame = () => frameById()[selectedElementId];
const selectedLink = () => linkById()[selectedElementId];
const assumptionsForLink = (linkId) => (tree()?.assumptions || []).filter((assumption) => assumption.linkId === linkId);
const selectedSourceNodeIds = () => [...selectedElementIds].filter((id) => Boolean(nodeById()[id]));

const elementType = (id) => {
  if (nodeById()[id]) return "node";
  if (frameById()[id]) return "frame";
  if (linkById()[id]) return "link";
  return "unknown";
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
  tree()?.layout?.frames?.[frameId] || {
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
  if (!activeTree) return { width: 1200, height: 800 };
  const nodeBoxes = Object.values(activeTree.layout?.nodes || {});
  const frameBoxes = Object.values(activeTree.layout?.frames || {});
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
  const activeTree = tree();
  if (!activeTree) return;
  activeTree.viewState = {
    ...(activeTree.viewState || {}),
    activeFrameId,
    selectedElementId,
    mode,
    zoom: zoomLevel,
    pan: { x: viewportState.left, y: viewportState.top },
    panels: { ...panelState }
  };
};

const scheduleViewStatePersist = () => {
  window.clearTimeout(viewPersistTimer);
  viewPersistTimer = window.setTimeout(async () => {
    updateViewState();
    const activeTree = tree();
    const treeId = activeTree.id;
    const viewState = structuredClone(activeTree.viewState);
    await enqueueWorkspaceOperation(async () => {
      const result = await window.ltpPrototype.saveViewState(treeId, viewState);
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
  const logicalCenter = {
    x: (viewportState.left + shell.clientWidth / 2) / zoomLevel,
    y: (viewportState.top + shell.clientHeight / 2) / zoomLevel
  };
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
  let point = null;
  if (selectedElementType === "node") point = centerOf(layoutNode(selectedElementId));
  if (selectedElementType === "frame") point = centerOf(layoutFrame(selectedElementId));
  if (selectedElementType === "link") point = layoutLink(selectedElementId).labelPosition;
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

const persist = async (label = "Update workspace") => {
  window.clearTimeout(viewPersistTimer);
  const pendingWorkspace = structuredClone(workspaceData);
  return enqueueWorkspaceOperation(async () => {
    pendingWorkspace.revision = workspaceData.revision || 0;
    pendingWorkspace.updatedAt = now();
    const activeTree = pendingWorkspace.trees?.[0];
    if (activeTree) activeTree.updatedAt = now();
    workspaceData = await window.ltpPrototype.saveWorkspace(pendingWorkspace, {
      recordHistory: true,
      includeViewState: false,
      label
    });
    historyState = await window.ltpPrototype.getHistoryState();
    setStatus("Saved locally");
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
  if (!frameById()[activeFrameId]) activeFrameId = activeTree.rootFrameId;
  if (selectedElementId && elementType(selectedElementId) === "unknown") selectedElementId = null;
  for (const id of [...selectedElementIds]) {
    if (elementType(id) === "unknown") selectedElementIds.delete(id);
  }
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
    workspaceData = result.workspace;
    historyState = result.history;
    reconcileUiAfterHistory();
    setStatus(`${direction === "undo" ? "Undid" : "Redid"}: ${result.label}`);
    render();
    focusCanvas();
  });
};

const refreshMaps = () => {
  selectedElementType = elementType(selectedElementId);
  for (const id of [...selectedElementIds]) {
    if (!nodeById()[id]) selectedElementIds.delete(id);
  }
};

const selectElement = async (id) => {
  const nextType = elementType(id);
  hintBuffer = "";

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
    selectedElementId = id;
    selectedElementType = "node";
    mode = "navigation";
    connectionSourceId = null;
    selectedElementIds.clear();
    multiSelectMode = false;
    hintsVisible = false;
    setStatus(`${sourceIds.length} source link${sourceIds.length === 1 ? "" : "s"} ready for this target`);
    render();
    return;
  }

  if (multiSelectMode) {
    if (nextType !== "node") {
      hintsVisible = true;
      setStatus("Multi-select marks source nodes only");
      render();
      return;
    }

    selectedElementId = id;
    selectedElementType = "node";
    if (selectedElementIds.has(id)) {
      selectedElementIds.delete(id);
    } else {
      selectedElementIds.add(id);
    }
    hintsVisible = true;
    hintEntries = visibleHintEntries();
    setStatus(`${selectedElementIds.size} source node${selectedElementIds.size === 1 ? "" : "s"} marked. Press L to choose the target.`);
    render();
    return;
  }

  selectedElementId = id;
  selectedElementType = nextType;
  selectedElementIds.clear();
  hintsVisible = false;
  render();
};

const hintAlphabetForMode = () => (multiSelectMode && mode !== "connection" ? hintAlphabet.replace("L", "") : hintAlphabet);

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

  for (const frame of activeTree.frames) {
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

  const modeFilteredEntries = mode === "connection" || multiSelectMode ? entries.filter((entry) => entry.type === "node") : entries;
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
  const frameBox = layoutFrame(frame.id);
  const frameInner = {
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
  const frame = frameById()[frameId] || frameById()[activeTree.rootFrameId];
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
  selectedElementId = id;
  selectedElementType = "node";
  selectedElementIds.clear();
  multiSelectMode = false;
  await persist("Create node");
  render();
  return id;
};

const createNodeInViewport = () =>
  createNode(activeFrameId, "necessaryCondition", "New necessary condition", { placement: "viewport" });

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
  const parent = frameById()[activeFrameId] || frameById()[activeTree.rootFrameId];
  const parentBox = layoutFrame(parent.id);
  const id = uid("frame");
  const frame = {
    id,
    treeId: activeTree.id,
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
  activeTree.frames.push(frame);
  parent.childFrameIds.push(id);
  activeTree.layout.frames[id] = {
    x: parentBox.x + 42,
    y: parentBox.y + 72,
    width: 320,
    height: 190,
    pinned: false,
    layoutSource: "manual"
  };
  selectedElementId = id;
  selectedElementType = "frame";
  selectedElementIds.clear();
  multiSelectMode = false;
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

const frameAtPoint = (point) => {
  const candidates = tree().frames.filter((frame) => {
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
  return candidates[0] || frameById()[tree().rootFrameId];
};

const moveNodeToFrame = async (nodeId, targetFrameId, position = null) => {
  const node = nodeById()[nodeId];
  const targetFrame = frameById()[targetFrameId];
  if (!node || !targetFrame) return;

  for (const frame of tree().frames) {
    frame.nodeIds = frame.nodeIds.filter((id) => id !== nodeId);
  }
  if (!targetFrame.nodeIds.includes(nodeId)) targetFrame.nodeIds.push(nodeId);
  const previousFrameId = node.frameId;
  node.frameId = targetFrame.id;
  node.updatedAt = now();

  const box = tree().layout.nodes[nodeId];
  if (position) {
    box.x = Math.round(position.x);
    box.y = Math.round(position.y);
  } else {
    const targetBox = layoutFrame(targetFrame.id);
    const fitsTarget =
      box.x >= targetBox.x + 18 &&
      box.y >= targetBox.y + 48 &&
      box.x + box.width <= targetBox.x + targetBox.width - 18 &&
      box.y + box.height <= targetBox.y + targetBox.height - 18;
    if (!fitsTarget) {
      box.x = Math.round(targetBox.x + 36);
      box.y = Math.round(targetBox.y + 62);
    }
  }
  box.layoutSource = "manual";
  for (const link of tree().links.filter((item) => item.sourceNodeId === nodeId || item.targetNodeId === nodeId)) {
    const source = centerOf(layoutNode(link.sourceNodeId));
    const target = centerOf(layoutNode(link.targetNodeId));
    tree().layout.links[link.id] = {
      ...layoutLink(link.id),
      labelPosition: {
        x: Math.round((source.x + target.x) / 2),
        y: Math.round((source.y + target.y) / 2)
      }
    };
  }

  await persist("Move entity");
  setStatus(previousFrameId === targetFrame.id ? "Entity moved" : `Entity moved to ${targetFrame.name}`);
  render();
};

const createLink = async (sourceNodeId, targetNodeId, options = {}) => {
  const { selectCreated = true, persistAfter = true, renderAfter = true } = options;
  const activeTree = tree();
  const source = nodeById()[sourceNodeId];
  const target = nodeById()[targetNodeId];
  if (!source || !target) return;

  const existingLink = activeTree.links.find((link) => link.sourceNodeId === sourceNodeId && link.targetNodeId === targetNodeId);
  if (existingLink) {
    if (selectCreated) {
      selectedElementId = existingLink.id;
      selectedElementType = "link";
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
    selectedElementId = id;
    selectedElementType = "link";
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
  selectedElementId = nodeId;
  selectedElementType = "node";
  selectedElementIds.clear();
  multiSelectMode = false;
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
    const box = activeTree.layout.frames[selectedElementId];
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
  const nextTree = nextWorkspace.trees[0];
  const startLayout = structuredClone(activeTree.layout);
  const targetLayout = nextTree.layout;
  const moved = [...Object.keys(targetLayout.nodes || {}), ...Object.keys(targetLayout.frames || {})].filter((id) => {
    const start = startLayout.nodes?.[id] || startLayout.frames?.[id];
    const target = targetLayout.nodes?.[id] || targetLayout.frames?.[id];
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
        frames: interpolatedBoxMap(startLayout.frames, targetLayout.frames, progress),
        links: interpolatedLinkMap(startLayout.links, targetLayout.links, progress)
      };
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
  layoutAnimating = true;
  setStatus("Running ELK layout...");
  try {
    const nextWorkspace = await window.ltpPrototype.runLayout(workspaceData);
    setStatus("Repositioning diagram...");
    await animateToLayout(nextWorkspace);
    await persist("Apply layout");
    setStatus("Layout updated with ELK.js");
    render();
  } finally {
    layoutAnimating = false;
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
    selectedElementId = activeFrameId;
    selectedElementType = "frame";
    render();
  }
};

const enterSelectedFrame = () => {
  const frame = selectedFrame();
  if (frame) {
    activeFrameId = frame.id;
    render();
  }
};

const beginConnection = () => {
  const sourceIds = selectedSourceNodeIds();
  if (!sourceIds.length && !selectedNode()) {
    setStatus("Select a node before entering connection mode");
    return;
  }
  mode = "connection";
  connectionSourceId = sourceIds[0] || selectedElementId;
  showHints();
  setStatus(`Connection mode: choose target node for ${sourceIds.length || 1} source${(sourceIds.length || 1) === 1 ? "" : "s"}`);
};

const toggleMultiSelect = () => {
  multiSelectMode = !multiSelectMode;
  mode = "navigation";
  connectionSourceId = null;
  hintBuffer = "";

  if (multiSelectMode) {
    if (selectedNode()) selectedElementIds.add(selectedElementId);
    showHints();
    setStatus(`${selectedElementIds.size} source node${selectedElementIds.size === 1 ? "" : "s"} marked. Choose more nodes, then press L.`);
    return;
  }

  selectedElementIds.clear();
  hintsVisible = false;
  setStatus("Multi-select cleared");
  render();
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
  if (binding.primary) parts.push("Cmd/Ctrl");
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
          <dd>${escapeHtml(frameById()[activeFrameId]?.name || "")}</dd>
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
  const activeTree = tree();
  return activeTree.frames
    .map((frame) => {
      const box = layoutFrame(frame.id);
      const active = frame.id === activeFrameId ? "active" : "";
      const selected = frame.id === selectedElementId ? "selected" : "";
      return `
        <button class="tree-frame ${active} ${selected}" data-element-id="${frame.id}" data-element-type="frame"
          style="left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;">
          <span>${escapeHtml(frame.name)}</span>
          <small>${escapeHtml(frame.semanticType || "visual frame")}</small>
        </button>
      `;
    })
    .join("");
};

const nodeTypeLabel = (type) =>
  ({
    goal: "Goal",
    criticalSuccessFactor: "CSF",
    necessaryCondition: "NC",
    assumption: "Assumption"
  })[type] || type;

const layoutDirectionLabel = (direction) =>
  ({
    TB: "Top to bottom",
    BT: "Bottom to top",
    LR: "Left to right",
    RL: "Right to left"
  })[direction] || direction;

const updateLayoutDirection = async (direction) => {
  if (!["TB", "BT", "LR", "RL"].includes(direction)) return;
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
      const multiSelected = selectedElementIds.has(node.id) ? "multi-selected" : "";
      return `
        <button class="tree-node ${selected} ${multiSelected} node-${node.type}" data-element-id="${node.id}" data-element-type="node"
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

const pointOnBoxEdge = (box, toward) => {
  const center = centerOf(box);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (!dx && !dy) return center;
  const scale = 1 / Math.max(Math.abs(dx) / (box.width / 2), Math.abs(dy) / (box.height / 2));
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale
  };
};

const linkEndpoints = (sourceBox, targetBox) => {
  const sourceCenter = centerOf(sourceBox);
  const targetCenter = centerOf(targetBox);
  return {
    source: pointOnBoxEdge(sourceBox, targetCenter),
    target: pointOnBoxEdge(targetBox, sourceCenter)
  };
};

const renderLinks = () => {
  const activeTree = tree();
  const size = canvasSize();
  const lines = activeTree.links
    .map((link) => {
      const sourceBox = layoutNode(link.sourceNodeId);
      const targetBox = layoutNode(link.targetNodeId);
      const { source, target } = linkEndpoints(sourceBox, targetBox);
      const selected = link.id === selectedElementId ? "selected" : "";
      const marker = selected ? "arrow-selected" : "arrow";
      return `
        <line class="tree-link-line ${selected}" data-link-id="${link.id}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" marker-end="url(#${marker})" />
      `;
    })
    .join("");

  const hitTargets = activeTree.links
    .map((link) => {
      const label = layoutLink(link.id).labelPosition || { x: 0, y: 0 };
      const selected = link.id === selectedElementId ? "selected" : "";
      const hintVisible = hintsVisible ? "hint-visible" : "";
      return `
        <button class="link-target ${selected} ${hintVisible}" data-element-id="${link.id}" data-element-type="link" style="left:${label.x - 12}px;top:${label.y - 12}px;" title="${escapeHtml(link.meaning)}">L</button>
      `;
    })
    .join("");

  return `
    <svg class="links-svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
      <defs>
        <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L0,8 L11,4 z" fill="#3f4945"></path>
        </marker>
        <marker id="arrow-selected" markerWidth="13" markerHeight="13" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L0,9 L12,4.5 z" fill="#9f4f45"></path>
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
  const frames = tree()
    .frames.map((frame) => {
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
  selectedElementId = nodeId;
  selectedElementType = "node";
  previewNodeId = nodeId;
  render();
  app.querySelector("[data-action='close-node-preview']")?.focus();
};

const closeNodePreview = (options = {}) => {
  const nodeId = previewNodeId;
  previewNodeId = null;
  if (options.continueEditing && nodeById()[nodeId]) {
    selectedElementId = nodeId;
    selectedElementType = "node";
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

  if (mode === "connection" || mode === "editing" || multiSelectMode || selectedElementIds.size) {
    if (mode === "editing") restoreInspectorAfterEditing();
    mode = "navigation";
    connectionSourceId = null;
    multiSelectMode = false;
    selectedElementIds.clear();
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
    selectedElementId = null;
    selectedElementType = "unknown";
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
  if (type === "frame" && id === tree().rootFrameId) {
    setStatus("The root frame cannot be deleted");
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
    for (const frame of activeTree.frames) frame.nodeIds = frame.nodeIds.filter((nodeId) => nodeId !== id);
    for (const assumption of activeTree.assumptions) {
      if (assumption.promotedNodeId === id) assumption.promotedNodeId = null;
    }
    delete activeTree.layout.nodes[id];
  }

  if (type === "frame" && id !== activeTree.rootFrameId) {
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
    activeTree.frames = activeTree.frames.filter((frame) => !frameIds.has(frame.id));
    for (const frame of activeTree.frames) {
      frame.childFrameIds = frame.childFrameIds.filter((frameId) => !frameIds.has(frameId));
      frame.nodeIds = frame.nodeIds.filter((nodeId) => !nodeIds.has(nodeId));
    }
    for (const assumption of activeTree.assumptions) {
      if (nodeIds.has(assumption.promotedNodeId)) assumption.promotedNodeId = null;
    }
    for (const nodeId of nodeIds) delete activeTree.layout.nodes[nodeId];
    for (const frameId of frameIds) delete activeTree.layout.frames[frameId];
    if (frameIds.has(activeFrameId)) activeFrameId = activeTree.rootFrameId;
  }

  deleteCandidateId = null;
  selectedElementId = null;
  selectedElementType = "unknown";
  selectedElementIds.clear();
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
  return `
    <main class="prototype-main">
      <header class="prototype-topbar">
        <div>
          <h2>${escapeHtml(tree()?.name)}</h2>
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
            ${["TB", "BT", "LR", "RL"]
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
          <span>Selected: <strong>${escapeHtml(selectedElementId || "none")}</strong></span>
          <span>Sources: <strong>${selectedElementIds.size}</strong></span>
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
          ${["goal", "criticalSuccessFactor", "necessaryCondition", "assumption"].map((type) => `<option value="${type}" ${node.type === type ? "selected" : ""}>${nodeTypeLabel(type)}</option>`).join("")}
        </select>
        <label>Frame</label>
        <select data-node-frame data-id="${node.id}">
          ${tree()
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
        <button data-action="enter-frame">Enter frame</button>
        <button data-action="pin">Toggle pin</button>
        ${frame.id === tree().rootFrameId ? "" : '<button class="danger-action" data-action="delete-selection">Delete frame</button>'}
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

const updateDraggedNodeVisual = (nodeId, nextBox) => {
  const element = app.querySelector(`[data-element-id="${nodeId}"]`);
  if (element) {
    element.style.left = `${nextBox.x}px`;
    element.style.top = `${nextBox.y}px`;
  }

  for (const link of tree().links.filter((item) => item.sourceNodeId === nodeId || item.targetNodeId === nodeId)) {
    const sourceBox = link.sourceNodeId === nodeId ? nextBox : layoutNode(link.sourceNodeId);
    const targetBox = link.targetNodeId === nodeId ? nextBox : layoutNode(link.targetNodeId);
    const endpoints = linkEndpoints(sourceBox, targetBox);
    const line = app.querySelector(`[data-link-id="${link.id}"]`);
    line?.setAttribute("x1", endpoints.source.x);
    line?.setAttribute("y1", endpoints.source.y);
    line?.setAttribute("x2", endpoints.target.x);
    line?.setAttribute("y2", endpoints.target.y);
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
  const startBox = { ...layoutNode(nodeId) };
  const startPointer = { x: event.clientX, y: event.clientY };
  let nextBox = startBox;
  let dragging = false;
  let targetFrame = frameById()[nodeById()[nodeId]?.frameId];

  const move = (moveEvent) => {
    const dx = (moveEvent.clientX - startPointer.x) / zoomLevel;
    const dy = (moveEvent.clientY - startPointer.y) / zoomLevel;
    if (!dragging && Math.hypot(dx, dy) < 5) return;
    dragging = true;
    moveEvent.preventDefault();
    nextBox = { ...startBox, x: startBox.x + dx, y: startBox.y + dy };
    targetFrame = frameAtPoint(centerOf(nextBox));
    app.querySelectorAll(".tree-frame").forEach((frameElement) => {
      frameElement.classList.toggle("drop-target", frameElement.dataset.elementId === targetFrame.id);
    });
    updateDraggedNodeVisual(nodeId, nextBox);
  };

  const finish = async () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    app.querySelectorAll(".tree-frame.drop-target").forEach((frameElement) => frameElement.classList.remove("drop-target"));
    if (!dragging) return;
    element.dataset.dragged = "true";
    await moveNodeToFrame(nodeId, targetFrame?.id || tree().rootFrameId, nextBox);
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
      selectElement(element.dataset.elementId);
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
  if (binding.primary) {
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

  if (multiSelectMode && mode !== "connection" && hintsVisible && event.key.toLowerCase() === "l" && selectedElementIds.size) {
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
  workspaceData = await window.ltpPrototype.loadWorkspace();
  historyState = await window.ltpPrototype.getHistoryState();
  const activeTree = tree();
  selectedElementId = activeTree.viewState?.selectedElementId || activeTree.nodes[0]?.id;
  activeFrameId = activeTree.viewState?.activeFrameId || activeTree.rootFrameId;
  viewportState = {
    left: activeTree.viewState?.pan?.x || 0,
    top: activeTree.viewState?.pan?.y || 0
  };
  zoomLevel = clamp(activeTree.viewState?.zoom || 1, 0.35, 2.5);
  panelState = {
    leftOpen: activeTree.viewState?.panels?.leftOpen ?? true,
    rightOpen: activeTree.viewState?.panels?.rightOpen ?? true
  };
  selectedElementType = elementType(selectedElementId);
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
  selectedElementId = initialSelection;
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

  selectedElementId = tree().nodes[0]?.id;
  selectedElementType = "node";
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

  selectedElementId = tree().nodes[0]?.id;
  selectedElementType = "node";
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
    tree().frames.every((frame) => !frame.nodeIds.includes(cascadeSourceId));
  requestDeleteSelection(cascadeTargetId);
  await confirmDeletion();

  await createFrame();
  const temporaryFrameId = selectedElementId;
  const frameNodeId = await createNode(temporaryFrameId, "necessaryCondition", "Temporary frame node");
  const frameLinkId = await createLink(frameNodeId, tree().nodes[0].id);
  const linkCountBeforeFrameMove = tree().links.length;
  const dragElement = document.querySelector(`[data-element-id="${frameNodeId}"]`);
  const dragStartBox = layoutNode(frameNodeId);
  const rootBox = layoutFrame(tree().rootFrameId);
  const dragTarget = { x: rootBox.x + 18, y: rootBox.y + 18 };
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
  await waitFor(() => nodeById()[frameNodeId]?.frameId === tree().rootFrameId);
  const entityCanLeaveFrame =
    nodeById()[frameNodeId].frameId === tree().rootFrameId &&
    frameById()[tree().rootFrameId].nodeIds.includes(frameNodeId) &&
    !frameById()[temporaryFrameId].nodeIds.includes(frameNodeId);
  await moveNodeToFrame(frameNodeId, temporaryFrameId);
  const entityCanEnterFrame =
    nodeById()[frameNodeId].frameId === temporaryFrameId &&
    frameById()[temporaryFrameId].nodeIds.includes(frameNodeId) &&
    tree().links.length === linkCountBeforeFrameMove &&
    Boolean(linkById()[frameLinkId]);
  requestDeleteSelection(temporaryFrameId);
  await confirmDeletion();
  const frameDeletionCascades =
    !frameById()[temporaryFrameId] &&
    !nodeById()[frameNodeId] &&
    !linkById()[frameLinkId] &&
    !tree().layout.frames[temporaryFrameId] &&
    !tree().layout.nodes[frameNodeId] &&
    tree().frames.every((frame) => !frame.childFrameIds.includes(temporaryFrameId));
  requestDeleteSelection(tree().rootFrameId);
  const rootFrameIsProtected = deleteCandidateId === null && Boolean(frameById()[tree().rootFrameId]);

  hintEntries = visibleHintEntries();
  const finalTree = tree();

  return {
    ok:
      Boolean(workspaceData) &&
      finalTree.nodes.length >= 10 &&
      finalTree.frames.length >= 4 &&
      finalTree.links.length >= 6 &&
      hintEntries.length > 0 &&
      document.querySelectorAll(".tree-node").length >= 10 &&
      document.querySelectorAll(".tree-frame").length >= 4 &&
      document.querySelectorAll(".link-target").length >= 6 &&
      hintsArePrefixFree &&
      twoLetterHintWorks &&
      keyboardHintsToggle &&
      hintButtonToggles &&
      allShortcutsListed &&
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
      rootFrameIsProtected &&
      Object.keys(commandBindings).length >= 10 &&
      Boolean(exportResult.path),
    nodes: finalTree.nodes.length,
    frames: finalTree.frames.length,
    links: finalTree.links.length,
    hints: hintEntries.length,
    hintsArePrefixFree,
    twoLetterHintWorks,
    keyboardHintsToggle,
    hintButtonToggles,
    allShortcutsListed,
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
    rootFrameIsProtected,
    exportPath: exportResult.path
  };
};
