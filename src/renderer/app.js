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

const app = document.querySelector("#app");
const hintAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const commandBindings = window.LTP_COMMAND_BINDINGS || {};

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
    await window.ltpPrototype.saveWorkspace(workspaceData);
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

const focusCanvas = () => {
  app.querySelector(".canvas")?.focus();
};

const focusPrimaryEditor = () => {
  if (!selectedElementId || selectedElementType === "unknown") return;
  mode = "editing";
  setStatus("Editing selected element");
  render();
  const editor = app.querySelector("[data-primary-editor]");
  editor?.focus();
  if (editor?.setSelectionRange && typeof editor.value === "string") {
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }
};

const persist = async () => {
  workspaceData.updatedAt = now();
  const activeTree = tree();
  if (activeTree) activeTree.updatedAt = now();
  workspaceData = await window.ltpPrototype.saveWorkspace(workspaceData);
  setStatus("Saved locally");
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

const visibleHintEntries = () => {
  const activeTree = tree();
  if (!activeTree) return [];
  const query = searchText.trim().toLowerCase();
  const entries = [];

  for (const frame of activeTree.frames) {
    const box = layoutFrame(frame.id);
    if (!query || frame.name.toLowerCase().includes(query)) {
      entries.push({ id: frame.id, type: "frame", x: box.x + 16, y: box.y + 16, label: frame.name });
    }
  }

  for (const node of activeTree.nodes) {
    const box = layoutNode(node.id);
    const text = `${node.shortLabel || ""} ${node.statement || ""}`.toLowerCase();
    if (!query || text.includes(query)) {
      entries.push({ id: node.id, type: "node", x: box.x + box.width - 18, y: box.y - 10, label: node.shortLabel || node.statement });
    }
  }

  for (const link of activeTree.links) {
    const box = layoutLink(link.id).labelPosition || { x: 0, y: 0 };
    const text = `${link.meaning || ""} ${link.verbalization || ""}`.toLowerCase();
    if (!query || text.includes(query)) {
      entries.push({ id: link.id, type: "link", x: box.x, y: box.y, label: link.meaning || link.id });
    }
  }

  const modeFilteredEntries = mode === "connection" || multiSelectMode ? entries.filter((entry) => entry.type === "node") : entries;
  const labels = generateHintLabels(modeFilteredEntries.length);
  return modeFilteredEntries.map((entry, index) => ({ ...entry, hint: labels[index] }));
};

const showHints = () => {
  hintsVisible = true;
  hintBuffer = "";
  hintEntries = visibleHintEntries();
  setStatus(`Hints active: ${hintEntries.length} selectable elements`);
  render();
};

const hideHints = () => {
  hintsVisible = false;
  hintBuffer = "";
  render();
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
  const node = nodeById()[id];
  node[field] = value;
  node.updatedAt = now();
  render();
  await persist();
};

const updateFrame = async (id, field, value) => {
  const frame = frameById()[id];
  frame[field] = value;
  frame.updatedAt = now();
  render();
  await persist();
};

const updateLink = async (id, field, value) => {
  const link = linkById()[id];
  link[field] = value;
  link.updatedAt = now();
  render();
  await persist();
};

const updateAssumption = async (id, value) => {
  const assumption = tree().assumptions.find((item) => item.id === id);
  assumption.statement = value;
  assumption.updatedAt = now();
  render();
  await persist();
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
  await persist();
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
  await persist();
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
  if (persistAfter) await persist();
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
  await persist();
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
  await persist();
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
  await persist();
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
  await persist();
  render();
};

const runAutoLayout = async () => {
  setStatus("Running ELK layout...");
  workspaceData = await window.ltpPrototype.runLayout(workspaceData);
  await persist();
  setStatus("Layout updated with ELK.js");
  render();
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
        <p><kbd>H</kbd> hints <kbd>M</kbd> multi-source <kbd>N</kbd> node</p>
        <p><kbd>L</kbd> link <kbd>F</kbd> frame <kbd>Enter</kbd> edit</p>
        <p><kbd>[</kbd>/<kbd>]</kbd> frame nav <kbd>P</kbd> pin <kbd>/</kbd> search</p>
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
        <line class="tree-link-line ${selected}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" marker-end="url(#${marker})" />
      `;
    })
    .join("");

  const hitTargets = activeTree.links
    .map((link) => {
      const label = layoutLink(link.id).labelPosition || { x: 0, y: 0 };
      const selected = link.id === selectedElementId ? "selected" : "";
      return `
        <button class="link-target ${selected}" data-element-id="${link.id}" data-element-type="link" style="left:${label.x - 12}px;top:${label.y - 12}px;" title="${escapeHtml(link.meaning)}">L</button>
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
        <div class="hint-badge hint-${entry.type}" style="left:${entry.x}px;top:${entry.y}px;">
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
  const maxWidth = 180;
  const maxHeight = 120;
  const scale = Math.min(maxWidth / size.width, maxHeight / size.height);
  return {
    scale,
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale))
  };
};

const minimapViewportStyle = () => {
  const metrics = minimapMetrics();
  return {
    left: (viewportState.left / zoomLevel) * metrics.scale,
    top: (viewportState.top / zoomLevel) * metrics.scale,
    width: Math.min(metrics.width, (viewportSize.width / zoomLevel) * metrics.scale),
    height: Math.min(metrics.height, (viewportSize.height / zoomLevel) * metrics.scale)
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

const renderMinimap = () => {
  const metrics = minimapMetrics();
  const viewport = minimapViewportStyle();
  const linkLines = tree()
    .links.map((link) => {
      const source = centerOf(layoutNode(link.sourceNodeId));
      const target = centerOf(layoutNode(link.targetNodeId));
      return `<line x1="${source.x * metrics.scale}" y1="${source.y * metrics.scale}" x2="${target.x * metrics.scale}" y2="${target.y * metrics.scale}" />`;
    })
    .join("");
  const frames = tree()
    .frames.map((frame) => {
      const box = layoutFrame(frame.id);
      return `<div class="minimap-frame" style="left:${box.x * metrics.scale}px;top:${box.y * metrics.scale}px;width:${box.width * metrics.scale}px;height:${box.height * metrics.scale}px;"></div>`;
    })
    .join("");
  const nodes = tree()
    .nodes.map((node) => {
      const box = layoutNode(node.id);
      return `<div class="minimap-node minimap-node-${node.type}" style="left:${box.x * metrics.scale}px;top:${box.y * metrics.scale}px;width:${Math.max(3, box.width * metrics.scale)}px;height:${Math.max(2, box.height * metrics.scale)}px;"></div>`;
    })
    .join("");

  return `
    <div class="minimap" aria-label="Diagram minimap">
      <div class="minimap-map" data-minimap-map data-scale="${metrics.scale}" style="width:${metrics.width}px;height:${metrics.height}px;">
        <svg viewBox="0 0 ${metrics.width} ${metrics.height}" width="${metrics.width}" height="${metrics.height}">${linkLines}</svg>
        ${frames}
        ${nodes}
        <div class="minimap-viewport" style="left:${viewport.left}px;top:${viewport.top}px;width:${viewport.width}px;height:${viewport.height}px;"></div>
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
    mode = "navigation";
    connectionSourceId = null;
    multiSelectMode = false;
    selectedElementIds.clear();
    hintsVisible = false;
    setStatus("Current mode cancelled");
    render();
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
  await persist();
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
          <div class="zoom-controls" aria-label="Zoom controls">
            <button data-action="zoom-out" title="Zoom out">-</button>
            <button data-action="zoom-reset" title="Reset zoom">${Math.round(zoomLevel * 100)}%</button>
            <button data-action="zoom-in" title="Zoom in">+</button>
            <button data-action="fit-view" title="Fit diagram">Fit</button>
          </div>
          <button data-action="hints">Hints</button>
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
            ${renderHints()}
          </div>
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
  updateMinimapViewport();
};

const commitInspectorField = async (field) => {
  mode = "navigation";
  const { id, nodeField, frameField, linkField, assumptionId } = field.dataset;

  if (nodeField) await updateNode(id, nodeField, field.value);
  if (frameField) await updateFrame(id, frameField, field.value || null);
  if (linkField) await updateLink(id, linkField, field.value);
  if (assumptionId) await updateAssumption(assumptionId, field.value);

  setStatus("Changes accepted");
  focusCanvas();
};

const bindEvents = () => {
  app.querySelectorAll("[data-element-id]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      selectElement(element.dataset.elementId);
    });
    if (element.dataset.elementType === "node") {
      element.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        openNodePreview(element.dataset.elementId);
      });
    }
  });

  app.querySelectorAll("[data-node-field]").forEach((field) => {
    field.addEventListener("change", () => updateNode(field.dataset.id, field.dataset.nodeField, field.value));
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
      mode = "editing";
      updateViewState();
      setStatus("Editing selected element");
    });
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
      if (action === "export") exportMarkdown();
      if (action === "hints") showHints();
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
    const logicalPoint = {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
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
    showHints,
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

  if (multiSelectMode && mode !== "connection" && hintsVisible && event.key.toLowerCase() === "l" && selectedElementIds.size) {
    event.preventDefault();
    beginConnection();
    return;
  }

  if (hintsVisible && /^[a-z]$/i.test(event.key)) {
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

  setZoom(1.25, { persist: false });
  const zoomWorks =
    zoomLevel === 1.25 && document.querySelector(".canvas-content")?.style.transform === "scale(1.25)";
  setViewportPosition(0, 0, { persist: false });
  const panStart = document.querySelector(".canvas-shell").scrollLeft;
  panViewport(80, 0);
  const keyboardPanWorks = document.querySelector(".canvas-shell").scrollLeft > panStart;
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
      hintEntries.length >= finalTree.nodes.length &&
      document.querySelectorAll(".tree-node").length >= 10 &&
      document.querySelectorAll(".tree-frame").length >= 4 &&
      document.querySelectorAll(".link-target").length >= 6 &&
      hintsArePrefixFree &&
      twoLetterHintWorks &&
      viewportPreserved &&
      arrowEndsAtEdge &&
      fullTextPreviewWorks &&
      enterStartsEditing &&
      shiftEnterKeepsEditing &&
      enterCommitsEditing &&
      previewOpenedWithSpace &&
      previewClosedWithSpace &&
      previewEnterContinuesEditing &&
      ctrlGClearsSelection &&
      nodeCreatedInViewport &&
      consecutiveNodesAreOffset &&
      zoomWorks &&
      keyboardPanWorks &&
      minimapWorks &&
      fitViewWorks &&
      leftPanelCollapses &&
      rightPanelCollapses &&
      deleteConfirmationWorks &&
      deleteCancellationWorks &&
      linkDeletionCleansReferences &&
      nodeDeletionCascades &&
      frameDeletionCascades &&
      rootFrameIsProtected &&
      Object.keys(commandBindings).length >= 10 &&
      Boolean(exportResult.path),
    nodes: finalTree.nodes.length,
    frames: finalTree.frames.length,
    links: finalTree.links.length,
    hints: hintEntries.length,
    hintsArePrefixFree,
    twoLetterHintWorks,
    viewportPreserved,
    arrowEndsAtEdge,
    fullTextPreviewWorks,
    enterStartsEditing,
    shiftEnterKeepsEditing,
    enterCommitsEditing,
    previewOpenedWithSpace,
    previewClosedWithSpace,
    previewEnterContinuesEditing,
    ctrlGClearsSelection,
    nodeCreatedInViewport,
    consecutiveNodesAreOffset,
    zoomWorks,
    keyboardPanWorks,
    minimapWorks,
    fitViewWorks,
    leftPanelCollapses,
    rightPanelCollapses,
    deleteConfirmationWorks,
    deleteCancellationWorks,
    linkDeletionCleansReferences,
    nodeDeletionCascades,
    frameDeletionCascades,
    rootFrameIsProtected,
    exportPath: exportResult.path
  };
};
