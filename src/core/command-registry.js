const { LtpError } = require("./errors");
const { current, isDraft } = require("immer");
const { getDiagramDefinition } = require("./diagram-registry");

const cloneValue = (value) => structuredClone(isDraft(value) ? current(value) : value);

const findTree = (workspace, treeId) => {
  const tree = workspace.trees?.find((candidate) => candidate.id === treeId);
  if (!tree) throw new LtpError("TREE_NOT_FOUND", `Tree ${treeId} was not found`, { treeId });
  return tree;
};

const findCanvas = (workspace, canvasId) => {
  const canvas = workspace.canvases?.find((candidate) => candidate.id === canvasId);
  if (!canvas) throw new LtpError("CANVAS_NOT_FOUND", `Canvas ${canvasId} was not found`, { canvasId });
  return canvas;
};

const preserveViewState = (currentWorkspace, replacement) => {
  const currentCanvasViews = new Map((currentWorkspace.canvases || []).map((canvas) => [canvas.id, canvas.viewState]));
  for (const canvas of replacement.canvases || []) {
    if (currentCanvasViews.has(canvas.id)) canvas.viewState = cloneValue(currentCanvasViews.get(canvas.id));
  }
  const currentViews = new Map((currentWorkspace.trees || []).map((tree) => [tree.id, tree.viewState]));
  for (const tree of replacement.trees || []) {
    if (currentViews.has(tree.id)) tree.viewState = cloneValue(currentViews.get(tree.id));
  }
};

const createCommandRegistry = () => {
  const handlers = new Map();

  const register = (type, handler) => handlers.set(type, handler);
  const apply = (draft, command, context) => {
    const handler = handlers.get(command.type);
    if (!handler) throw new LtpError("COMMAND_UNKNOWN", `Unknown command type: ${command.type}`, { type: command.type });
    return handler(draft, command.payload || {}, context);
  };

  register("workspace.replace", (draft, payload) => {
    if (!payload.workspace) throw new LtpError("COMMAND_INVALID", "workspace.replace requires payload.workspace");
    const replacement = structuredClone(payload.workspace);
    if (payload.includeViewState === false) preserveViewState(draft, replacement);
    return replacement;
  });

  register("node.update", (draft, payload, context) => {
    const allowedFields = new Set(["statement", "shortLabel", "status", "type"]);
    if (!allowedFields.has(payload.field)) {
      throw new LtpError("FIELD_NOT_ALLOWED", `Field ${payload.field} cannot be updated by node.update`, { field: payload.field });
    }
    const tree = findTree(draft, payload.treeId);
    const node = tree.nodes.find((candidate) => candidate.id === payload.nodeId);
    if (!node) throw new LtpError("NODE_NOT_FOUND", `Node ${payload.nodeId} was not found`, { nodeId: payload.nodeId });
    if (payload.field === "type") {
      const typeDefinition = getDiagramDefinition(tree.type)?.nodeTypes.find((candidate) => candidate.id === payload.value);
      if (!typeDefinition) {
        throw new LtpError("NODE_TYPE_INVALID", `Type ${payload.value} is not allowed in ${tree.type}`, { type: payload.value });
      }
      if (typeDefinition.unique && tree.nodes.some((candidate) => candidate.id !== node.id && candidate.type === payload.value)) {
        throw new LtpError("NODE_TYPE_UNIQUE", `Type ${payload.value} can only be used once`, { type: payload.value });
      }
    }
    node[payload.field] = payload.value;
    node.updatedAt = context.now;
    tree.updatedAt = context.now;
  });

  register("nodes.update-type", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const nodeIds = [...new Set(payload.nodeIds || [])];
    if (!nodeIds.length) throw new LtpError("NODE_SELECTION_EMPTY", "nodes.update-type requires at least one node");
    const nodes = nodeIds.map((nodeId) => {
      const node = tree.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) throw new LtpError("NODE_NOT_FOUND", `Node ${nodeId} was not found`, { nodeId });
      return node;
    });
    const typeDefinition = getDiagramDefinition(tree.type)?.nodeTypes.find((candidate) => candidate.id === payload.value);
    if (!typeDefinition) {
      throw new LtpError("NODE_TYPE_INVALID", `Type ${payload.value} is not allowed in ${tree.type}`, { type: payload.value });
    }
    if (
      typeDefinition.unique &&
      (nodes.length > 1 || tree.nodes.some((candidate) => !nodeIds.includes(candidate.id) && candidate.type === payload.value))
    ) {
      throw new LtpError("NODE_TYPE_UNIQUE", `Type ${payload.value} can only be used once`, { type: payload.value });
    }
    for (const node of nodes) {
      node.type = payload.value;
      node.updatedAt = context.now;
    }
    tree.updatedAt = context.now;
  });

  register("view.update", (draft, payload) => {
    if (payload.canvasId) {
      findCanvas(draft, payload.canvasId).viewState = structuredClone(payload.viewState || {});
      return;
    }
    findTree(draft, payload.treeId).viewState = structuredClone(payload.viewState || {});
  });

  return { register, apply, has: (type) => handlers.has(type) };
};

module.exports = { createCommandRegistry };
