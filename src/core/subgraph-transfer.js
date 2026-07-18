const { LtpError } = require("./errors");

const clone = (value) => structuredClone(value);
const collections = ["elements", "relations", "assumptions", "derivations"];

const requireArray = (clipboard, key) => {
  if (!Array.isArray(clipboard?.[key])) {
    throw new LtpError("SUBGRAPH_CLIPBOARD_INVALID", `clipboard.${key} must be an array`, { key });
  }
  return clipboard[key];
};

const requireCompleteIdMap = (clipboard, idMap) => {
  const newIds = new Set();
  for (const key of collections) {
    if (!idMap?.[key] || typeof idMap[key] !== "object") {
      throw new LtpError("SUBGRAPH_ID_MAP_INVALID", `idMap.${key} is required`, { key });
    }
    for (const item of clipboard[key]) {
      const nextId = idMap[key][item.id];
      if (typeof nextId !== "string" || !nextId.trim() || newIds.has(nextId)) {
        throw new LtpError("SUBGRAPH_ID_MAP_INVALID", `Invalid replacement ID for ${item.id}`, { key, id: item.id });
      }
      newIds.add(nextId);
    }
  }
  return newIds;
};

const validateClosure = (clipboard) => {
  const elementIds = new Set(clipboard.elements.map((item) => item.id));
  const relationIds = new Set(clipboard.relations.map((item) => item.id));
  const assumptionIds = new Set(clipboard.assumptions.map((item) => item.id));
  if (!elementIds.size) throw new LtpError("SUBGRAPH_SELECTION_EMPTY", "A subgraph must contain at least one semantic element");
  for (const relation of clipboard.relations) {
    for (const endpoint of [...(relation.inputs || []), ...(relation.outputs || [])]) {
      if (!elementIds.has(endpoint.elementId)) {
        throw new LtpError("SUBGRAPH_RELATION_OPEN", `Relation ${relation.id} has an endpoint outside the subgraph`, {
          relationId: relation.id,
          elementId: endpoint.elementId
        });
      }
    }
  }
  for (const assumption of clipboard.assumptions) {
    if (!relationIds.has(assumption.subject?.relationId)) {
      throw new LtpError("SUBGRAPH_ASSUMPTION_OPEN", `Assumption ${assumption.id} targets a relation outside the subgraph`, {
        assumptionId: assumption.id
      });
    }
    if (assumption.subject?.elementId && !elementIds.has(assumption.subject.elementId)) {
      throw new LtpError("SUBGRAPH_ASSUMPTION_OPEN", `Assumption ${assumption.id} targets an element outside the subgraph`, {
        assumptionId: assumption.id
      });
    }
  }
  for (const derivation of clipboard.derivations) {
    const openElement = [derivation.sourceElementId, derivation.targetElementId].find((id) => id && !elementIds.has(id));
    if (openElement || (derivation.targetAssumptionId && !assumptionIds.has(derivation.targetAssumptionId))) {
      throw new LtpError("SUBGRAPH_DERIVATION_OPEN", `Derivation ${derivation.id} targets data outside the subgraph`, {
        derivationId: derivation.id
      });
    }
  }
};

const remap = (clipboard, idMap) => {
  const remapEndpoint = (endpoint) => ({ ...endpoint, elementId: idMap.elements[endpoint.elementId] });
  return {
    elements: clipboard.elements.map((item) => ({ ...clone(item), id: idMap.elements[item.id] })),
    relations: clipboard.relations.map((item) => ({
      ...clone(item),
      id: idMap.relations[item.id],
      inputs: (item.inputs || []).map(remapEndpoint),
      outputs: (item.outputs || []).map(remapEndpoint)
    })),
    assumptions: clipboard.assumptions.map((item) => ({
      ...clone(item),
      id: idMap.assumptions[item.id],
      subject: {
        ...clone(item.subject),
        relationId: idMap.relations[item.subject.relationId],
        ...(item.subject.elementId ? { elementId: idMap.elements[item.subject.elementId] } : {})
      }
    })),
    derivations: clipboard.derivations.map((item) => ({
      ...clone(item),
      id: idMap.derivations[item.id],
      ...(item.sourceElementId ? { sourceElementId: idMap.elements[item.sourceElementId] } : {}),
      ...(item.targetElementId ? { targetElementId: idMap.elements[item.targetElementId] } : {}),
      ...(item.targetAssumptionId ? { targetAssumptionId: idMap.assumptions[item.targetAssumptionId] } : {})
    }))
  };
};

const pastedBoxes = (clipboard, idMap, origin) => Object.fromEntries(clipboard.elements.map((element) => {
  const box = clipboard.layout?.[element.id] || {};
  return [idMap.elements[element.id], {
    x: Math.round(origin.x + (Number.isFinite(box.x) ? box.x : 0)),
    y: Math.round(origin.y + (Number.isFinite(box.y) ? box.y : 0)),
    width: Number.isFinite(box.width) ? box.width : 250,
    height: Number.isFinite(box.height) ? box.height : 72,
    pinned: false,
    layoutSource: "paste"
  }];
}));

const expandFrame = (canvas, frameId, boxes) => {
  const frame = canvas.frames.find((item) => item.id === frameId);
  const frameBox = canvas.layout?.frames?.[frameId];
  if (!frame || !frameBox || frame.id === canvas.rootFrameId) return;
  const padding = 28;
  const left = Math.min(frameBox.x, ...boxes.map((box) => box.x - padding));
  const top = Math.min(frameBox.y, ...boxes.map((box) => box.y - padding));
  const right = Math.max(frameBox.x + frameBox.width, ...boxes.map((box) => box.x + box.width + padding));
  const bottom = Math.max(frameBox.y + frameBox.height, ...boxes.map((box) => box.y + box.height + padding));
  Object.assign(frameBox, { x: left, y: top, width: right - left, height: bottom - top });
  if (frame.parentFrameId) expandFrame(canvas, frame.parentFrameId, [frameBox]);
};

const createSubgraphPasteHandler = (services) => (draft, payload, context) => {
  const tree = services.findTree(draft, payload.treeId);
  const kernel = services.requireSemanticKernel(tree);
  const canvas = services.findCanvas(draft, tree.canvasId);
  const targetFrame = canvas.frames.find((item) => item.id === payload.targetFrameId && item.treeId === tree.id);
  if (!targetFrame) throw new LtpError("FRAME_NOT_FOUND", `Frame ${payload.targetFrameId} is not part of tree ${tree.id}`);
  const clipboard = payload.clipboard;
  if (clipboard?.contractVersion !== "subgraph.clipboard.v1") {
    throw new LtpError("SUBGRAPH_CLIPBOARD_INVALID", "Unsupported subgraph clipboard contract");
  }
  for (const key of collections) requireArray(clipboard, key);
  const destinationType = kernel.diagramType || kernel.profile || tree.type;
  if (clipboard.diagramType !== destinationType) {
    throw new LtpError("SUBGRAPH_DIAGRAM_MISMATCH", `Cannot paste ${clipboard.diagramType} into ${destinationType}`, {
      source: clipboard.diagramType,
      destination: destinationType
    });
  }
  validateClosure(clipboard);
  const newIds = requireCompleteIdMap(clipboard, payload.idMap);
  for (const id of newIds) services.requireUniqueSemanticId(tree, id);
  const origin = payload.origin || {};
  if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new LtpError("SUBGRAPH_ORIGIN_INVALID", "Paste origin must contain finite x and y coordinates");
  }
  const content = remap(clipboard, payload.idMap);
  const boxes = pastedBoxes(clipboard, payload.idMap, origin);
  if (services.isNativeSemanticTree(tree)) {
    kernel.elements.push(...content.elements);
    kernel.relations.push(...content.relations);
    kernel.assumptions.push(...content.assumptions);
    kernel.derivations ||= [];
    kernel.derivations.push(...content.derivations);
    tree.renderProjection ||= {};
    tree.renderProjection.frameByNodeId ||= {};
    for (const element of content.elements) tree.renderProjection.frameByNodeId[element.id] = targetFrame.id;
  } else {
    if (content.derivations.length) {
      throw new LtpError("SEMANTIC_COMPATIBILITY_UNSUPPORTED", "Goal Tree compatibility cannot paste derivations");
    }
    const legacyTypes = new Map(content.elements.map((element) => [
      element.id,
      services.requireSemanticElementType(tree, element.type)
    ]));
    for (const element of content.elements) {
      const type = legacyTypes.get(element.id);
      tree.nodes.push({
        id: element.id,
        treeId: tree.id,
        frameId: targetFrame.id,
        type,
        statement: element.statement,
        shortLabel: element.shortLabel || element.statement,
        status: element.status || "draft",
        tags: [...(element.tags || [type])],
        sourceIds: [...(element.sourceIds || [])],
        validation: clone(element.validation || {}),
        promotedFrom: null,
        createdAt: context.now,
        updatedAt: context.now
      });
      targetFrame.nodeIds.push(element.id);
    }
    for (const relation of content.relations) {
      if (relation.type !== "NECESSITY" || relation.combination !== "SIMPLE" || relation.renderMode !== "IMPLICIT"
          || relation.inputs.length !== 1 || relation.outputs.length !== 1) {
        throw new LtpError("SEMANTIC_COMPATIBILITY_UNSUPPORTED", `Relation ${relation.id} is not a Goal Tree relation`);
      }
      const link = {
        id: relation.id,
        treeId: tree.id,
        sourceNodeId: relation.inputs[0].elementId,
        targetNodeId: relation.outputs[0].elementId,
        type: "necessity",
        logic: "necessity",
        meaning: "",
        verbalization: "",
        assumptionIds: [],
        sourceIds: [...(relation.sourceIds || [])],
        validation: clone(relation.validation || { status: "draft" }),
        visual: { route: [], routeSource: "auto", labelPosition: { x: 0, y: 0 } },
        createdAt: context.now,
        updatedAt: context.now
      };
      services.refreshGoalTreeLinkText(tree, link);
      tree.links.push(link);
      tree.layout.links[link.id] = clone(link.visual);
    }
    for (const assumption of content.assumptions) {
      const relationId = assumption.subject.relationId;
      tree.assumptions.push({
        id: assumption.id,
        treeId: tree.id,
        linkId: relationId,
        statement: assumption.statement,
        status: String(assumption.status || "DRAFT").toLowerCase(),
        sourceIds: [...(assumption.sourceIds || [])],
        promotedNodeId: null,
        createdAt: context.now,
        updatedAt: context.now
      });
      tree.links.find((link) => link.id === relationId).assumptionIds.push(assumption.id);
    }
  }
  Object.assign(tree.layout.nodes, boxes);
  expandFrame(canvas, targetFrame.id, Object.values(boxes));
  tree.updatedAt = context.now;
};

module.exports = { createSubgraphPasteHandler, validateClosure };
