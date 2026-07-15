const selectionClosure = (tree, rootIds = [], availableFrames = null) => {
  if (!tree) return [];

  const frames = new Map((availableFrames || tree.frames || []).map((frame) => [frame.id, frame]));
  const nodes = new Map((tree.nodes || []).map((node) => [node.id, node]));
  const links = new Map((tree.links || []).map((link) => [link.id, link]));
  const selected = new Set();

  const collectFrame = (frameId) => {
    if (selected.has(frameId) || !frames.has(frameId)) return;
    selected.add(frameId);
    for (const childFrameId of frames.get(frameId).childFrameIds || []) collectFrame(childFrameId);
  };

  for (const id of rootIds) {
    if (frames.has(id)) collectFrame(id);
    if (nodes.has(id) || links.has(id)) selected.add(id);
  }

  const selectedFrameIds = new Set([...selected].filter((id) => frames.has(id)));
  for (const node of nodes.values()) {
    if (selectedFrameIds.has(node.frameId)) selected.add(node.id);
  }

  const selectedNodeIds = new Set([...selected].filter((id) => nodes.has(id)));
  for (const link of links.values()) {
    if (selectedNodeIds.has(link.sourceNodeId) && selectedNodeIds.has(link.targetNodeId)) selected.add(link.id);
  }

  return [...selected];
};

const selectionModel = { selectionClosure };

if (typeof module !== "undefined" && module.exports) module.exports = selectionModel;
if (typeof globalThis !== "undefined") globalThis.LTP_SELECTION_MODEL = selectionModel;
