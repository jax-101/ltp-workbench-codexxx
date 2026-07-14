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

const app = document.querySelector("#app");
const hintAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

const generateHintLabel = (index, alphabet = hintAlphabetForMode()) => {
  if (index < alphabet.length) return alphabet[index];
  const first = Math.floor(index / alphabet.length) - 1;
  const second = index % alphabet.length;
  return `${alphabet[first]}${alphabet[second]}`;
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
  return modeFilteredEntries.map((entry, index) => ({ ...entry, hint: generateHintLabel(index) }));
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

const createNode = async (frameId = activeFrameId, type = "necessaryCondition", statement = "New necessary condition") => {
  const activeTree = tree();
  const id = uid("node");
  const frame = frameById()[frameId] || frameById()[activeTree.rootFrameId];
  const frameBox = layoutFrame(frame.id);
  const offset = frame.nodeIds.length * 18;
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
    x: frameBox.x + 48 + offset,
    y: frameBox.y + 80 + offset,
    width: 250,
    height: 72,
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
  const activeSystem = system();
  const activeTree = tree();
  const profile = activeSystem?.profile || {};
  return `
    <aside class="side-panel">
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
          style="left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;">
          <strong>${escapeHtml(nodeTypeLabel(node.type))}</strong>
          <span>${escapeHtml(node.statement)}</span>
          ${box.pinned ? "<em>Pinned</em>" : ""}
        </button>
      `;
    })
    .join("");

const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const renderLinks = () => {
  const activeTree = tree();
  const size = canvasSize();
  const lines = activeTree.links
    .map((link) => {
      const sourceBox = layoutNode(link.sourceNodeId);
      const targetBox = layoutNode(link.targetNodeId);
      const source = centerOf(sourceBox);
      const target = centerOf(targetBox);
      const selected = link.id === selectedElementId ? "selected" : "";
      return `
        <line class="tree-link-line ${selected}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" marker-end="url(#arrow)" />
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
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#59635f"></path>
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

const renderCanvas = () => {
  const size = canvasSize();
  return `
    <main class="prototype-main">
      <header class="prototype-topbar">
        <div>
          <h2>${escapeHtml(tree()?.name)}</h2>
          <p>${escapeHtml(breadcrumb())}</p>
        </div>
        <div class="topbar-actions">
          <input class="search-input" data-search value="${escapeHtml(searchText)}" placeholder="Search (/)" />
          <button data-action="hints">Hints</button>
          <button data-action="layout">Layout</button>
        </div>
      </header>

      <div class="canvas-shell">
        <div class="canvas-status">
          <span>Mode: <strong>${escapeHtml(mode)}</strong></span>
          <span>Selected: <strong>${escapeHtml(selectedElementId || "none")}</strong></span>
          <span>Sources: <strong>${selectedElementIds.size}</strong></span>
          <span data-status>${escapeHtml(statusText)}</span>
        </div>
        <div class="canvas" tabindex="0" style="width:${size.width}px;height:${size.height}px;">
          ${renderLinks()}
          ${renderFrames()}
          ${renderNodes()}
          ${renderHints()}
        </div>
      </div>
    </main>
  `;
};

const renderInspector = () => {
  const node = selectedNode();
  const frame = selectedFrame();
  const link = selectedLink();

  if (node) {
    return `
      <aside class="inspector">
        <h2>${escapeHtml(nodeTypeLabel(node.type))}</h2>
        <label>Statement</label>
        <textarea data-node-field="statement" data-id="${node.id}">${escapeHtml(node.statement)}</textarea>
        <label>Short label</label>
        <input data-node-field="shortLabel" data-id="${node.id}" value="${escapeHtml(node.shortLabel || "")}" />
        <label>Type</label>
        <select data-node-field="type" data-id="${node.id}">
          ${["goal", "criticalSuccessFactor", "necessaryCondition", "assumption"].map((type) => `<option value="${type}" ${node.type === type ? "selected" : ""}>${nodeTypeLabel(type)}</option>`).join("")}
        </select>
        <button data-action="pin">Toggle pin</button>
      </aside>
    `;
  }

  if (frame) {
    return `
      <aside class="inspector">
        <h2>Frame</h2>
        <label>Name</label>
        <input data-frame-field="name" data-id="${frame.id}" value="${escapeHtml(frame.name)}" />
        <label>Semantic type</label>
        <input data-frame-field="semanticType" data-id="${frame.id}" value="${escapeHtml(frame.semanticType || "")}" />
        <label>Notes</label>
        <textarea data-frame-field="notes" data-id="${frame.id}">${escapeHtml(frame.notes || "")}</textarea>
        <button data-action="enter-frame">Enter frame</button>
        <button data-action="pin">Toggle pin</button>
      </aside>
    `;
  }

  if (link) {
    const assumptions = assumptionsForLink(link.id);
    return `
      <aside class="inspector">
        <h2>Link</h2>
        <label>Meaning</label>
        <textarea data-link-field="meaning" data-id="${link.id}">${escapeHtml(link.meaning || "")}</textarea>
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
      </aside>
    `;
  }

  return `<aside class="inspector"><h2>Inspector</h2><p>Select a node, frame, or link.</p></aside>`;
};

const render = () => {
  refreshMaps();
  app.innerHTML = `
    <div class="prototype-shell">
      ${renderSidebar()}
      ${renderCanvas()}
      ${renderInspector()}
    </div>
  `;
  bindEvents();
};

const bindEvents = () => {
  app.querySelectorAll("[data-element-id]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      selectElement(element.dataset.elementId);
    });
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

  app.querySelectorAll("[data-promote-assumption]").forEach((button) => {
    button.addEventListener("click", () => promoteAssumption(button.dataset.promoteAssumption));
  });

  app.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "layout") runAutoLayout();
      if (action === "export") exportMarkdown();
      if (action === "hints") showHints();
      if (action === "pin") togglePin();
      if (action === "add-assumption") addAssumptionToSelectedLink();
      if (action === "enter-frame") enterSelectedFrame();
    });
  });

  const search = app.querySelector("[data-search]");
  search?.addEventListener("input", () => {
    searchText = search.value;
  });
};

const handleKeydown = (event) => {
  const target = event.target;
  const isTextField = target?.matches?.("input, textarea, select");

  if (event.key === "Escape") {
    if (mode === "connection" || multiSelectMode || selectedElementIds.size) {
      mode = "navigation";
      connectionSourceId = null;
      multiSelectMode = false;
      selectedElementIds.clear();
      hintsVisible = false;
      setStatus("Selection mode cancelled");
      render();
      return;
    }
    if (hintsVisible) {
      hideHints();
      return;
    }
    mode = "navigation";
    connectionSourceId = null;
    render();
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

  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    runAutoLayout();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    setStatus("Command palette placeholder: use H, N, A, L, F, P, /");
    return;
  }

  switch (event.key) {
    case "H":
    case "h":
      event.preventDefault();
      showHints();
      break;
    case "M":
    case "m":
      event.preventDefault();
      toggleMultiSelect();
      break;
    case "N":
    case "n":
      event.preventDefault();
      createNode();
      break;
    case "A":
      event.preventDefault();
      createNode(selectedNode()?.frameId || activeFrameId, "necessaryCondition", "New parent/above condition");
      break;
    case "a":
      event.preventDefault();
      createSupportingNode();
      break;
    case "Enter":
      event.preventDefault();
      app.querySelector(".inspector textarea, .inspector input, .inspector select")?.focus();
      break;
    case "L":
    case "l":
      event.preventDefault();
      beginConnection();
      break;
    case "F":
    case "f":
      event.preventDefault();
      createFrame();
      break;
    case "[":
      event.preventDefault();
      selectParentFrame();
      break;
    case "]":
      event.preventDefault();
      enterSelectedFrame();
      break;
    case "/":
      event.preventDefault();
      document.querySelector("[data-search]")?.focus();
      break;
    case "P":
    case "p":
      event.preventDefault();
      togglePin();
      break;
    default:
      break;
  }
};

document.addEventListener("keydown", handleKeydown);

const bootPromise = (async () => {
  workspaceData = await window.ltpPrototype.loadWorkspace();
  const activeTree = tree();
  selectedElementId = activeTree.viewState?.selectedElementId || activeTree.nodes[0]?.id;
  activeFrameId = activeTree.viewState?.activeFrameId || activeTree.rootFrameId;
  selectedElementType = elementType(selectedElementId);
  statusText = "Prototype loaded";
  render();
})();

window.__ltpSmokeTest = async () => {
  await bootPromise;
  workspaceData = await window.ltpPrototype.runLayout(workspaceData);
  const exportResult = await window.ltpPrototype.exportMarkdown(workspaceData);
  render();
  const activeTree = tree();
  hintEntries = visibleHintEntries();
  return {
    ok:
      Boolean(workspaceData) &&
      activeTree.nodes.length >= 10 &&
      activeTree.frames.length >= 4 &&
      activeTree.links.length >= 6 &&
      hintEntries.length >= activeTree.nodes.length &&
      document.querySelectorAll(".tree-node").length >= 10 &&
      document.querySelectorAll(".tree-frame").length >= 4 &&
      document.querySelectorAll(".link-target").length >= 6 &&
      Boolean(exportResult.path),
    nodes: activeTree.nodes.length,
    frames: activeTree.frames.length,
    links: activeTree.links.length,
    hints: hintEntries.length,
    exportPath: exportResult.path
  };
};
