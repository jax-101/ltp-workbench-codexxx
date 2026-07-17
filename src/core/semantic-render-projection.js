const { createHash } = require("node:crypto");
const { LtpError } = require("./errors");
const { assertSemanticGraph } = require("./semantic-validator");

const NATIVE_STORAGE_MODE = "NATIVE";

const ELEMENT_TYPE_TO_NODE_TYPE = Object.freeze({
  ENTITY: "entity",
  UDE: "ude",
  ROOT_CAUSE: "rootCause",
  CRITICAL_ROOT_CAUSE: "criticalRootCause"
});

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
  );
};

const normalizeGraphOrder = (graph) => {
  const normalized = canonicalize(graph);
  const sortById = (items = []) => [...items].sort((left, right) => left.id.localeCompare(right.id));
  for (const key of ["elements", "relations", "assumptions", "derivations", "annotations"]) {
    if (Array.isArray(normalized[key])) normalized[key] = sortById(normalized[key]);
  }
  for (const relation of normalized.relations || []) {
    relation.inputs = [...(relation.inputs || [])].sort((left, right) => left.elementId.localeCompare(right.elementId));
    relation.outputs = [...(relation.outputs || [])].sort((left, right) => left.elementId.localeCompare(right.elementId));
  }
  return normalized;
};

const semanticGraphFingerprint = (graph) =>
  createHash("sha256").update(JSON.stringify(canonicalize(normalizeGraphOrder(graph)))).digest("hex");

const junctionId = (relationId) => `junction:${relationId}`;
const inputSegmentId = (relationId, elementId) => `${relationId}:input:${elementId}`;
const outputSegmentId = (relationId, elementId) => `${relationId}:output:${elementId}`;

const relationText = (relation, elementById) => {
  const inputs = relation.inputs.map((endpoint) => elementById.get(endpoint.elementId)?.statement || endpoint.elementId);
  const outputs = relation.outputs.map((endpoint) => elementById.get(endpoint.elementId)?.statement || endpoint.elementId);
  const joiner = relation.combination === "AND" ? " and " : relation.combination === "XOR" ? " xor " : " plus ";
  return `If ${inputs.join(joiner)}, then ${outputs.join(" and ")}.`;
};

const projectSemanticGraph = (graph) => {
  assertSemanticGraph(graph);
  const elementById = new Map(graph.elements.map((element) => [element.id, element]));
  const nodes = graph.elements.map((element) => ({
    id: element.id,
    type: ELEMENT_TYPE_TO_NODE_TYPE[element.type] || "entity",
    semanticType: element.type,
    statement: element.statement,
    shortLabel: element.shortLabel || element.statement,
    synthetic: null
  }));
  const links = [];

  for (const relation of graph.relations) {
    const usesJunction = relation.renderMode === "JUNCTION" || relation.inputs.length !== 1 || relation.outputs.length !== 1;
    const verbalization = relation.verbalization || relationText(relation, elementById);
    if (!usesJunction) {
      links.push({
        id: relation.id,
        sourceNodeId: relation.inputs[0].elementId,
        targetNodeId: relation.outputs[0].elementId,
        semanticRelationId: relation.id,
        segmentRole: "DIRECT",
        type: relation.type.toLowerCase(),
        logic: graph.logicMode.toLowerCase(),
        meaning: verbalization,
        verbalization
      });
      continue;
    }

    const visualJunctionId = junctionId(relation.id);
    nodes.push({
      id: visualJunctionId,
      type: "junction",
      semanticType: null,
      statement: relation.combination,
      shortLabel: relation.combination,
      synthetic: { kind: "JUNCTION", relationId: relation.id, combination: relation.combination }
    });
    for (const input of relation.inputs) {
      links.push({
        id: inputSegmentId(relation.id, input.elementId),
        sourceNodeId: input.elementId,
        targetNodeId: visualJunctionId,
        semanticRelationId: relation.id,
        segmentRole: "INPUT",
        type: relation.type.toLowerCase(),
        logic: graph.logicMode.toLowerCase(),
        meaning: verbalization,
        verbalization
      });
    }
    for (const output of relation.outputs) {
      links.push({
        id: outputSegmentId(relation.id, output.elementId),
        sourceNodeId: visualJunctionId,
        targetNodeId: output.elementId,
        semanticRelationId: relation.id,
        segmentRole: "OUTPUT",
        type: relation.type.toLowerCase(),
        logic: graph.logicMode.toLowerCase(),
        meaning: verbalization,
        verbalization
      });
    }
  }

  return {
    sourceFingerprint: semanticGraphFingerprint(graph),
    nodes: nodes.sort((left, right) => left.id.localeCompare(right.id)),
    links: links.sort((left, right) => left.id.localeCompare(right.id))
  };
};

const applyNativeSemanticProjection = (workspace, tree) => {
  if (tree.semanticKernel?.storageMode !== NATIVE_STORAGE_MODE) return false;
  const canvas = (workspace.canvases || []).find((candidate) => candidate.id === tree.canvasId);
  if (!canvas) {
    throw new LtpError("SEMANTIC_PROJECTION_CANVAS_MISSING", `Tree ${tree.id} has no canvas for its native projection`, {
      treeId: tree.id,
      canvasId: tree.canvasId
    });
  }
  const hostFrame = (canvas.frames || []).find((frame) => frame.id === tree.hostFrameId);
  if (!hostFrame) {
    throw new LtpError("SEMANTIC_PROJECTION_FRAME_MISSING", `Tree ${tree.id} has no host frame for its native projection`, {
      treeId: tree.id,
      frameId: tree.hostFrameId
    });
  }

  const projection = projectSemanticGraph(tree.semanticKernel);
  const existingNodes = new Map((tree.nodes || []).map((node) => [node.id, node]));
  const existingLinks = new Map((tree.links || []).map((link) => [link.id, link]));
  const previousNodeIds = new Set((tree.nodes || []).map((node) => node.id));
  const frameHints = tree.renderProjection?.frameByNodeId || {};
  const timestamp = tree.updatedAt || workspace.updatedAt || new Date(0).toISOString();

  tree.nodes = projection.nodes.map((projected, index) => {
    const existing = existingNodes.get(projected.id);
    return {
      ...(existing || {}),
      ...projected,
      treeId: tree.id,
      frameId: existing?.frameId || frameHints[projected.id] || tree.hostFrameId,
      status: existing?.status || "draft",
      tags: existing?.tags || [],
      sourceIds: existing?.sourceIds || [],
      validation: existing?.validation || {},
      promotedFrom: null,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
      projectionOrder: index
    };
  });
  tree.links = projection.links.map((projected) => {
    const existing = existingLinks.get(projected.id);
    return {
      ...(existing || {}),
      ...projected,
      treeId: tree.id,
      assumptionIds: [],
      sourceIds: existing?.sourceIds || [],
      validation: existing?.validation || {},
      visual: existing?.visual || { route: [], routeSource: "auto", labelPosition: { x: 0, y: 0 } },
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    };
  });
  tree.assumptions = [];
  tree.layout ||= { engine: "elk", direction: "BT", settings: {}, nodes: {}, links: {} };
  tree.layout.nodes ||= {};
  tree.layout.links ||= {};
  tree.layout.nodes = Object.fromEntries(tree.nodes.map((node, index) => {
    const existing = tree.layout.nodes[node.id];
    const isJunction = node.synthetic?.kind === "JUNCTION";
    return [node.id, existing || {
      x: 80 + (index % 3) * 300,
      y: 80 + Math.floor(index / 3) * 150,
      width: isJunction ? 32 : 250,
      height: isJunction ? 32 : 72,
      pinned: false,
      layoutSource: "semanticProjection"
    }];
  }));
  tree.layout.links = Object.fromEntries(tree.links.map((link) => [
    link.id,
    tree.layout.links[link.id] || { route: [], routeSource: "auto", labelPosition: { x: 0, y: 0 } }
  ]));

  for (const frame of canvas.frames || []) {
    frame.nodeIds = (frame.nodeIds || []).filter((nodeId) => !previousNodeIds.has(nodeId));
  }
  const frameById = new Map((canvas.frames || []).map((frame) => [frame.id, frame]));
  for (const node of tree.nodes) {
    const frame = frameById.get(node.frameId) || hostFrame;
    node.frameId = frame.id;
    if (!frame.nodeIds.includes(node.id)) frame.nodeIds.push(node.id);
  }

  tree.renderProjection = {
    kind: "SEMANTIC_NATIVE",
    sourceFingerprint: projection.sourceFingerprint,
    nodeIds: tree.nodes.map((node) => node.id),
    linkIds: tree.links.map((link) => link.id),
    frameByNodeId: Object.fromEntries(tree.nodes.map((node) => [node.id, node.frameId]))
  };
  return true;
};

module.exports = {
  ELEMENT_TYPE_TO_NODE_TYPE,
  NATIVE_STORAGE_MODE,
  applyNativeSemanticProjection,
  inputSegmentId,
  junctionId,
  outputSegmentId,
  projectSemanticGraph,
  semanticGraphFingerprint
};
