const { LtpError } = require("./errors");
const { current, isDraft } = require("immer");
const { getDiagramDefinition } = require("./diagram-registry");
const { NATIVE_STORAGE_MODE } = require("./semantic-render-projection");
const { normalizeAssumptionStatus } = require("./semantic-lifecycle");
const { createSubgraphPasteHandler } = require("./subgraph-transfer");
const cloneValue = (value) => structuredClone(isDraft(value) ? current(value) : value);

const LEGACY_TYPE_BY_SEMANTIC_TYPE = Object.freeze({
  GOAL: "goal",
  CSF: "criticalSuccessFactor",
  NC: "necessaryCondition"
});

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

const requireSemanticKernel = (tree) => {
  if (!tree.semanticKernel) {
    throw new LtpError("SEMANTIC_KERNEL_MISSING", `Tree ${tree.id} has no semantic kernel projection`, { treeId: tree.id });
  }
  return tree.semanticKernel;
};

const isNativeSemanticTree = (tree) => tree.semanticKernel?.storageMode === NATIVE_STORAGE_MODE;

const requireSemanticId = (payload, key) => {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new LtpError("COMMAND_INVALID", `${key} must be a non-empty string`, { key });
  }
  return value;
};

const requireSemanticElementType = (tree, semanticType, excludedNodeIds = []) => {
  const legacyType = LEGACY_TYPE_BY_SEMANTIC_TYPE[semanticType];
  const typeDefinition = getDiagramDefinition(tree.type)?.nodeTypes.find((candidate) => candidate.id === legacyType);
  if (!typeDefinition) {
    throw new LtpError("SEMANTIC_ELEMENT_TYPE_INVALID", `Type ${semanticType} is not allowed in ${tree.type}`, {
      treeId: tree.id,
      semanticType
    });
  }
  if (
    typeDefinition.unique &&
    tree.nodes.some((candidate) => !excludedNodeIds.includes(candidate.id) && candidate.type === legacyType)
  ) {
    throw new LtpError("NODE_TYPE_UNIQUE", `Type ${semanticType} can only be used once`, { type: semanticType });
  }
  return legacyType;
};

const requireUniqueSemanticId = (tree, id) => {
  const kernel = tree.semanticKernel || {};
  const ids = new Set([
    ...(tree.nodes || []).map((item) => item.id),
    ...(tree.links || []).map((item) => item.id),
    ...(tree.assumptions || []).map((item) => item.id),
    ...(kernel.elements || []).map((item) => item.id),
    ...(kernel.relations || []).map((item) => item.id),
    ...(kernel.assumptions || []).map((item) => item.id),
    ...(kernel.derivations || []).map((item) => item.id),
    ...(kernel.annotations || []).map((item) => item.id)
  ]);
  if (ids.has(id)) throw new LtpError("SEMANTIC_ID_DUPLICATE", `ID ${id} is already in use`, { id });
};

const removeGoalTreeRelations = (tree, relationIds) => {
  const removedAssumptionIds = new Set(
    tree.assumptions.filter((assumption) => relationIds.has(assumption.linkId)).map((assumption) => assumption.id)
  );
  tree.links = tree.links.filter((link) => !relationIds.has(link.id));
  tree.assumptions = tree.assumptions.filter((assumption) => !relationIds.has(assumption.linkId));
  for (const relationId of relationIds) delete tree.layout.links[relationId];
  return removedAssumptionIds;
};

const refreshGoalTreeLinkText = (tree, link) => {
  const source = tree.nodes.find((node) => node.id === link.sourceNodeId);
  const target = tree.nodes.find((node) => node.id === link.targetNodeId);
  if (!source || !target) return;
  link.meaning = `${source.statement} is necessary for ${target.statement}.`;
  link.verbalization = `In order to achieve ${target.statement}, we must have ${source.statement}.`;
};

const deleteNativeElements = (kernel, elementIds) => {
  const removedRelationIds = new Set(
    kernel.relations
      .filter((relation) => [...relation.inputs, ...relation.outputs].some((endpoint) => elementIds.has(endpoint.elementId)))
      .map((relation) => relation.id)
  );
  const removedAssumptionIds = new Set(
    kernel.assumptions
      .filter((assumption) => removedRelationIds.has(assumption.subject?.relationId))
      .map((assumption) => assumption.id)
  );
  kernel.elements = kernel.elements.filter((element) => !elementIds.has(element.id));
  kernel.relations = kernel.relations.filter((relation) => !removedRelationIds.has(relation.id));
  kernel.assumptions = kernel.assumptions.filter((assumption) => !removedAssumptionIds.has(assumption.id));
  kernel.derivations = (kernel.derivations || []).filter((derivation) =>
    !elementIds.has(derivation.sourceElementId)
    && !elementIds.has(derivation.targetElementId)
    && !removedAssumptionIds.has(derivation.targetAssumptionId)
  );
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
  register("semantic.subgraph.paste", createSubgraphPasteHandler({ findTree, findCanvas, requireSemanticKernel, isNativeSemanticTree, requireUniqueSemanticId, requireSemanticElementType, refreshGoalTreeLinkText }));
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

  register("semantic.element.update", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const allowedFields = isNativeSemanticTree(tree) ? new Set(["statement", "shortLabel", "type"]) : new Set(["statement", "type"]);
    if (!allowedFields.has(payload.field)) {
      throw new LtpError("FIELD_NOT_ALLOWED", `Field ${payload.field} cannot be updated by semantic.element.update`, { field: payload.field });
    }
    const element = kernel.elements.find((candidate) => candidate.id === payload.elementId);
    if (!element) throw new LtpError("SEMANTIC_ELEMENT_NOT_FOUND", `Element ${payload.elementId} was not found`, { elementId: payload.elementId });
    if (isNativeSemanticTree(tree)) {
      element[payload.field] = payload.value;
      tree.updatedAt = context.now;
      return;
    }
    const node = tree.nodes.find((candidate) => candidate.id === element.id);
    if (!node) throw new LtpError("NODE_NOT_FOUND", `Compatibility node ${element.id} was not found`, { nodeId: element.id });
    if (payload.field === "type") {
      node.type = requireSemanticElementType(tree, payload.value, [node.id]);
    } else {
      node.statement = payload.value;
    }
    node.updatedAt = context.now;
    for (const link of tree.links.filter((candidate) => candidate.sourceNodeId === node.id || candidate.targetNodeId === node.id)) {
      refreshGoalTreeLinkText(tree, link);
      link.updatedAt = context.now;
    }
    tree.updatedAt = context.now;
  });

  register("semantic.elements.update-type", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const elementIds = [...new Set(payload.elementIds || [])];
    if (!elementIds.length) throw new LtpError("SEMANTIC_SELECTION_EMPTY", "semantic.elements.update-type requires elements");
    const elements = elementIds.map((elementId) => {
      const element = kernel.elements.find((candidate) => candidate.id === elementId);
      if (!element) throw new LtpError("SEMANTIC_ELEMENT_NOT_FOUND", `Element ${elementId} was not found`, { elementId });
      return element;
    });
    if (isNativeSemanticTree(tree)) {
      for (const element of elements) element.type = payload.value;
      tree.updatedAt = context.now;
      return;
    }
    const legacyType = requireSemanticElementType(tree, payload.value, elementIds);
    if (legacyType === "goal" && elements.length > 1) {
      throw new LtpError("NODE_TYPE_UNIQUE", "Type GOAL can only be used once", { type: payload.value });
    }
    for (const element of elements) {
      const node = tree.nodes.find((candidate) => candidate.id === element.id);
      node.type = legacyType;
      node.updatedAt = context.now;
    }
    tree.updatedAt = context.now;
  });

  register("semantic.element.create", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const element = payload.element || {};
    const id = requireSemanticId(element, "id");
    requireUniqueSemanticId(tree, id);
    const canvas = findCanvas(draft, tree.canvasId);
    const frameId = payload.frameId || tree.hostFrameId;
    const frame = canvas.frames.find((candidate) => candidate.id === frameId && candidate.treeId === tree.id);
    if (!frame) throw new LtpError("FRAME_NOT_FOUND", `Frame ${frameId} is not part of tree ${tree.id}`, { frameId, treeId: tree.id });
    if (isNativeSemanticTree(tree)) {
      kernel.elements.push(cloneValue(element));
      tree.renderProjection ||= {};
      tree.renderProjection.frameByNodeId ||= {};
      tree.renderProjection.frameByNodeId[id] = frameId;
      const box = payload.layout || {};
      const frameBox = canvas.layout?.frames?.[frameId] || { x: 0, y: 0 };
      tree.layout.nodes[id] = {
        x: Number.isFinite(box.x) ? box.x : frameBox.x + 48,
        y: Number.isFinite(box.y) ? box.y : frameBox.y + 80,
        width: Number.isFinite(box.width) ? box.width : 250,
        height: Number.isFinite(box.height) ? box.height : 72,
        pinned: Boolean(box.pinned),
        layoutSource: box.layoutSource || "manual"
      };
      tree.updatedAt = context.now;
      return;
    }
    const legacyType = requireSemanticElementType(tree, element.type);
    const statement = element.statement;
    const box = payload.layout || {};
    const frameBox = canvas.layout?.frames?.[frameId] || { x: 0, y: 0 };
    const offset = frame.nodeIds.length * 24;
    tree.nodes.push({
      id,
      treeId: tree.id,
      frameId,
      type: legacyType,
      statement,
      shortLabel: element.shortLabel || statement,
      status: element.status || "draft",
      tags: [...(element.tags || [legacyType])],
      sourceIds: [...(element.sourceIds || [])],
      validation: cloneValue(element.validation || {}),
      promotedFrom: null,
      createdAt: context.now,
      updatedAt: context.now
    });
    frame.nodeIds.push(id);
    tree.layout.nodes[id] = {
      x: Number.isFinite(box.x) ? box.x : frameBox.x + 48 + offset,
      y: Number.isFinite(box.y) ? box.y : frameBox.y + 80 + offset,
      width: Number.isFinite(box.width) ? box.width : 250,
      height: Number.isFinite(box.height) ? box.height : 72,
      pinned: Boolean(box.pinned),
      layoutSource: box.layoutSource || "manual"
    };
    tree.updatedAt = context.now;
  });

  register("semantic.elements.delete", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const elementIds = new Set(payload.elementIds || []);
    if (!elementIds.size) throw new LtpError("SEMANTIC_SELECTION_EMPTY", "semantic.elements.delete requires elements");
    for (const elementId of elementIds) {
      if (!kernel.elements.some((candidate) => candidate.id === elementId)) {
        throw new LtpError("SEMANTIC_ELEMENT_NOT_FOUND", `Element ${elementId} was not found`, { elementId });
      }
    }
    if (isNativeSemanticTree(tree)) {
      deleteNativeElements(kernel, elementIds);
      tree.updatedAt = context.now;
      return;
    }
    const relationIds = new Set(
      tree.links
        .filter((link) => elementIds.has(link.sourceNodeId) || elementIds.has(link.targetNodeId))
        .map((link) => link.id)
    );
    removeGoalTreeRelations(tree, relationIds);
    tree.nodes = tree.nodes.filter((node) => !elementIds.has(node.id));
    const canvas = findCanvas(draft, tree.canvasId);
    for (const frame of canvas.frames) frame.nodeIds = frame.nodeIds.filter((nodeId) => !elementIds.has(nodeId));
    for (const assumption of tree.assumptions) {
      if (elementIds.has(assumption.promotedNodeId)) assumption.promotedNodeId = null;
    }
    for (const elementId of elementIds) delete tree.layout.nodes[elementId];
    tree.updatedAt = context.now;
  });

  register("semantic.relation.update-endpoints", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const relation = kernel.relations.find((candidate) => candidate.id === payload.relationId);
    if (!relation) throw new LtpError("SEMANTIC_RELATION_NOT_FOUND", `Relation ${payload.relationId} was not found`, { relationId: payload.relationId });
    if (isNativeSemanticTree(tree)) {
      const inputs = payload.inputs || (payload.inputElementId ? [{ elementId: payload.inputElementId }] : relation.inputs);
      const outputs = payload.outputs || (payload.outputElementId ? [{ elementId: payload.outputElementId }] : relation.outputs);
      const elementIds = new Set(kernel.elements.map((element) => element.id));
      for (const endpoint of [...inputs, ...outputs]) {
        if (!elementIds.has(endpoint.elementId)) {
          throw new LtpError("SEMANTIC_ENDPOINT_MISSING", `Element ${endpoint.elementId} was not found`, { elementId: endpoint.elementId });
        }
      }
      relation.inputs = cloneValue(inputs);
      relation.outputs = cloneValue(outputs);
      tree.updatedAt = context.now;
      return;
    }
    if (relation.combination !== "SIMPLE" || relation.inputs.length !== 1 || relation.outputs.length !== 1) {
      throw new LtpError("SEMANTIC_COMPATIBILITY_UNSUPPORTED", `Relation ${relation.id} cannot be represented as one legacy link`, {
        relationId: relation.id,
        combination: relation.combination
      });
    }
    const elementIds = new Set(kernel.elements.map((element) => element.id));
    if (!elementIds.has(payload.inputElementId) || !elementIds.has(payload.outputElementId)) {
      throw new LtpError("SEMANTIC_ENDPOINT_MISSING", "Relation endpoints must reference semantic elements", {
        inputElementId: payload.inputElementId,
        outputElementId: payload.outputElementId
      });
    }
    const link = tree.links.find((candidate) => candidate.id === relation.id);
    if (!link) throw new LtpError("LINK_NOT_FOUND", `Compatibility link ${relation.id} was not found`, { linkId: relation.id });
    link.sourceNodeId = payload.inputElementId;
    link.targetNodeId = payload.outputElementId;
    refreshGoalTreeLinkText(tree, link);
    link.updatedAt = context.now;
    tree.updatedAt = context.now;
  });

  register("semantic.frame.delete", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    if (!isNativeSemanticTree(tree)) {
      throw new LtpError("SEMANTIC_COMPATIBILITY_UNSUPPORTED", "semantic.frame.delete requires a native semantic tree");
    }
    const canvas = findCanvas(draft, tree.canvasId);
    const frame = canvas.frames.find((candidate) => candidate.id === payload.frameId);
    if (!frame) throw new LtpError("FRAME_NOT_FOUND", `Frame ${payload.frameId} was not found`, { frameId: payload.frameId });
    if (frame.id === canvas.rootFrameId || frame.id === tree.hostFrameId) {
      throw new LtpError("FRAME_PROTECTED", "Root and tree frames cannot be deleted", { frameId: frame.id });
    }
    const frameIds = new Set();
    const collect = (frameId) => {
      if (frameIds.has(frameId)) return;
      frameIds.add(frameId);
      const currentFrame = canvas.frames.find((candidate) => candidate.id === frameId);
      for (const childId of currentFrame?.childFrameIds || []) collect(childId);
    };
    collect(frame.id);
    const elementIds = new Set(
      tree.nodes
        .filter((node) => frameIds.has(node.frameId) && !node.synthetic)
        .map((node) => node.id)
    );
    deleteNativeElements(kernel, elementIds);
    canvas.frames = canvas.frames.filter((candidate) => !frameIds.has(candidate.id));
    for (const candidate of canvas.frames) {
      candidate.childFrameIds = candidate.childFrameIds.filter((frameId) => !frameIds.has(frameId));
      candidate.nodeIds = candidate.nodeIds.filter((nodeId) => !elementIds.has(nodeId));
    }
    for (const frameId of frameIds) delete canvas.layout.frames[frameId];
    for (const elementId of elementIds) delete tree.renderProjection?.frameByNodeId?.[elementId];
    tree.updatedAt = context.now;
  });

  register("semantic.relation.create", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const relation = payload.relation || {};
    const id = requireSemanticId(relation, "id");
    requireUniqueSemanticId(tree, id);
    if (isNativeSemanticTree(tree)) {
      kernel.relations.push(cloneValue(relation));
      tree.updatedAt = context.now;
      return;
    }
    if (relation.type !== "NECESSITY" || relation.combination !== "SIMPLE" || relation.renderMode !== "IMPLICIT") {
      throw new LtpError("SEMANTIC_COMPATIBILITY_UNSUPPORTED", "Goal Tree compatibility supports NECESSITY/SIMPLE/IMPLICIT relations", {
        relationId: id
      });
    }
    const inputs = relation.inputs || [];
    const outputs = relation.outputs || [];
    if (inputs.length !== 1 || outputs.length !== 1) {
      throw new LtpError("SEMANTIC_COMPATIBILITY_UNSUPPORTED", "A Goal Tree relation requires one input and one output", {
        relationId: id
      });
    }
    const elementIds = new Set(kernel.elements.map((element) => element.id));
    const sourceNodeId = inputs[0].elementId;
    const targetNodeId = outputs[0].elementId;
    if (!elementIds.has(sourceNodeId) || !elementIds.has(targetNodeId)) {
      throw new LtpError("SEMANTIC_ENDPOINT_MISSING", "Relation endpoints must reference semantic elements", {
        sourceNodeId,
        targetNodeId
      });
    }
    if (tree.links.some((link) => link.sourceNodeId === sourceNodeId && link.targetNodeId === targetNodeId)) {
      throw new LtpError("SEMANTIC_RELATION_DUPLICATE", "A relation with these endpoints already exists", {
        sourceNodeId,
        targetNodeId
      });
    }
    const sourceBox = tree.layout.nodes[sourceNodeId];
    const targetBox = tree.layout.nodes[targetNodeId];
    const link = {
      id,
      treeId: tree.id,
      sourceNodeId,
      targetNodeId,
      type: "necessity",
      logic: "necessity",
      meaning: "",
      verbalization: "",
      assumptionIds: [],
      sourceIds: [...(relation.sourceIds || [])],
      validation: cloneValue(relation.validation || { status: "draft" }),
      visual: {
        route: [],
        routeSource: "auto",
        labelPosition: {
          x: Math.round(((sourceBox?.x || 0) + (targetBox?.x || 0)) / 2),
          y: Math.round(((sourceBox?.y || 0) + (targetBox?.y || 0)) / 2)
        }
      },
      createdAt: context.now,
      updatedAt: context.now
    };
    refreshGoalTreeLinkText(tree, link);
    tree.links.push(link);
    tree.layout.links[id] = cloneValue(link.visual);
    tree.updatedAt = context.now;
  });

  register("semantic.relations.delete", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const relationIds = new Set(payload.relationIds || []);
    if (!relationIds.size) throw new LtpError("SEMANTIC_SELECTION_EMPTY", "semantic.relations.delete requires relations");
    for (const relationId of relationIds) {
      if (!kernel.relations.some((candidate) => candidate.id === relationId)) {
        throw new LtpError("SEMANTIC_RELATION_NOT_FOUND", `Relation ${relationId} was not found`, { relationId });
      }
    }
    if (isNativeSemanticTree(tree)) {
      kernel.relations = kernel.relations.filter((relation) => !relationIds.has(relation.id));
      const removedAssumptionIds = new Set(
        kernel.assumptions
          .filter((assumption) => relationIds.has(assumption.subject?.relationId))
          .map((assumption) => assumption.id)
      );
      kernel.assumptions = kernel.assumptions.filter((assumption) => !removedAssumptionIds.has(assumption.id));
      kernel.derivations = (kernel.derivations || []).filter((derivation) => !removedAssumptionIds.has(derivation.targetAssumptionId));
      tree.updatedAt = context.now;
      return;
    }
    removeGoalTreeRelations(tree, relationIds);
    tree.updatedAt = context.now;
  });

  register("semantic.assumption.update", (draft, payload, context) => {
    if (!["statement", "status"].includes(payload.field)) {
      throw new LtpError("FIELD_NOT_ALLOWED", `Field ${payload.field} cannot be updated by semantic.assumption.update`, { field: payload.field });
    }
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const semanticAssumption = kernel.assumptions.find((candidate) => candidate.id === payload.assumptionId);
    if (!semanticAssumption) {
      throw new LtpError("SEMANTIC_ASSUMPTION_NOT_FOUND", `Assumption ${payload.assumptionId} was not found`, { assumptionId: payload.assumptionId });
    }
    const value = payload.field === "status" ? normalizeAssumptionStatus(payload.value) : payload.value;
    if (payload.field === "status" && !value) {
      throw new LtpError("ASSUMPTION_STATUS_INVALID", `Assumption status ${payload.value} is invalid`, { status: payload.value });
    }
    if (isNativeSemanticTree(tree)) {
      semanticAssumption[payload.field] = value;
      tree.updatedAt = context.now;
      return;
    }
    const assumption = tree.assumptions.find((candidate) => candidate.id === semanticAssumption.id);
    if (!assumption) {
      throw new LtpError("ASSUMPTION_NOT_FOUND", `Compatibility assumption ${semanticAssumption.id} was not found`, { assumptionId: semanticAssumption.id });
    }
    assumption[payload.field] = payload.field === "status" ? value.toLowerCase() : value;
    assumption.updatedAt = context.now;
    tree.updatedAt = context.now;
  });

  register("semantic.assumption.create", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const semanticAssumption = cloneValue(payload.assumption || {});
    const id = requireSemanticId(semanticAssumption, "id");
    requireUniqueSemanticId(tree, id);
    semanticAssumption.status = normalizeAssumptionStatus(semanticAssumption.status, "DRAFT");
    if (!semanticAssumption.status) {
      throw new LtpError("ASSUMPTION_STATUS_INVALID", `Assumption status ${payload.assumption?.status} is invalid`, { status: payload.assumption?.status });
    }
    if (isNativeSemanticTree(tree)) {
      kernel.assumptions.push(semanticAssumption);
      tree.updatedAt = context.now;
      return;
    }
    const subject = semanticAssumption.subject || {};
    if (subject.kind !== "RELATION") {
      throw new LtpError("SEMANTIC_COMPATIBILITY_UNSUPPORTED", "Goal Tree assumptions must target a complete relation", {
        assumptionId: id,
        subjectKind: subject.kind
      });
    }
    const relation = kernel.relations.find((candidate) => candidate.id === subject.relationId);
    if (!relation) {
      throw new LtpError("SEMANTIC_RELATION_NOT_FOUND", `Relation ${subject.relationId} was not found`, {
        relationId: subject.relationId
      });
    }
    const link = tree.links.find((candidate) => candidate.id === relation.id);
    tree.assumptions.push({
      id,
      treeId: tree.id,
      linkId: relation.id,
      statement: semanticAssumption.statement,
      status: semanticAssumption.status.toLowerCase(),
      sourceIds: [...(semanticAssumption.sourceIds || [])],
      promotedNodeId: null,
      createdAt: context.now,
      updatedAt: context.now
    });
    link.assumptionIds.push(id);
    link.updatedAt = context.now;
    tree.updatedAt = context.now;
  });

  register("semantic.assumptions.delete", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const assumptionIds = new Set(payload.assumptionIds || []);
    if (!assumptionIds.size) throw new LtpError("SEMANTIC_SELECTION_EMPTY", "semantic.assumptions.delete requires assumptions");
    for (const assumptionId of assumptionIds) {
      if (!kernel.assumptions.some((candidate) => candidate.id === assumptionId)) {
        throw new LtpError("SEMANTIC_ASSUMPTION_NOT_FOUND", `Assumption ${assumptionId} was not found`, { assumptionId });
      }
    }
    if (isNativeSemanticTree(tree)) {
      kernel.assumptions = kernel.assumptions.filter((assumption) => !assumptionIds.has(assumption.id));
      kernel.derivations = (kernel.derivations || []).filter((derivation) => !assumptionIds.has(derivation.targetAssumptionId));
      tree.updatedAt = context.now;
      return;
    }
    tree.assumptions = tree.assumptions.filter((assumption) => !assumptionIds.has(assumption.id));
    for (const link of tree.links) {
      link.assumptionIds = link.assumptionIds.filter((assumptionId) => !assumptionIds.has(assumptionId));
    }
    tree.updatedAt = context.now;
  });

  register("semantic.assumptions.update-status", (draft, payload, context) => {
    const tree = findTree(draft, payload.treeId);
    const kernel = requireSemanticKernel(tree);
    const assumptionIds = new Set(payload.assumptionIds || []);
    if (!assumptionIds.size) throw new LtpError("SEMANTIC_SELECTION_EMPTY", "semantic.assumptions.update-status requires assumptions");
    const status = normalizeAssumptionStatus(payload.status);
    if (!status) throw new LtpError("ASSUMPTION_STATUS_INVALID", `Assumption status ${payload.status} is invalid`, { status: payload.status });
    for (const assumptionId of assumptionIds) {
      if (!kernel.assumptions.some((candidate) => candidate.id === assumptionId)) {
        throw new LtpError("SEMANTIC_ASSUMPTION_NOT_FOUND", `Assumption ${assumptionId} was not found`, { assumptionId });
      }
    }
    if (isNativeSemanticTree(tree)) {
      for (const assumption of kernel.assumptions) {
        if (assumptionIds.has(assumption.id)) assumption.status = status;
      }
      tree.updatedAt = context.now;
      return;
    }
    for (const assumption of tree.assumptions) {
      if (!assumptionIds.has(assumption.id)) continue;
      assumption.status = status.toLowerCase();
      assumption.updatedAt = context.now;
    }
    tree.updatedAt = context.now;
  });

  register("semantic.element.delete", (draft, payload, context) =>
    handlers.get("semantic.elements.delete")(
      draft,
      { ...payload, elementIds: [requireSemanticId(payload, "elementId")] },
      context
    )
  );

  register("semantic.relation.delete", (draft, payload, context) =>
    handlers.get("semantic.relations.delete")(
      draft,
      { ...payload, relationIds: [requireSemanticId(payload, "relationId")] },
      context
    )
  );

  register("semantic.assumption.delete", (draft, payload, context) =>
    handlers.get("semantic.assumptions.delete")(
      draft,
      { ...payload, assumptionIds: [requireSemanticId(payload, "assumptionId")] },
      context
    )
  );

  register("semantic.assumption.update-status", (draft, payload, context) =>
    handlers.get("semantic.assumptions.update-status")(
      draft,
      { ...payload, assumptionIds: [requireSemanticId(payload, "assumptionId")] },
      context
    )
  );

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
