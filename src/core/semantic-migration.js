const { createHash } = require("node:crypto");
const { LtpError } = require("./errors");
const { assertSemanticGraph } = require("./semantic-validator");

const KERNEL_VERSION = "0.1";
const CONTRACT_VERSION = "0.1";

const PROFILE_BY_TREE_TYPE = Object.freeze({ goalTree: "GOAL_TREE" });
const LOGIC_MODE = Object.freeze({ necessity: "NECESSITY", sufficiency: "SUFFICIENCY" });
const ELEMENT_TYPE = Object.freeze({
  goal: "GOAL",
  criticalSuccessFactor: "CSF",
  necessaryCondition: "NC"
});

const clone = (value) => structuredClone(value);
const byId = (left, right) => left.id.localeCompare(right.id);

const semanticSource = (tree) => ({
  id: tree.id,
  type: tree.type,
  logicMode: tree.logicMode,
  nodes: (tree.nodes || []).map((node) => ({
    id: node.id,
    type: node.type,
    statement: node.statement,
    shortLabel: node.shortLabel,
    status: node.status,
    tags: node.tags,
    sourceIds: node.sourceIds,
    validation: node.validation,
    promotedFrom: node.promotedFrom
  })).sort(byId),
  links: (tree.links || []).map((link) => ({
    id: link.id,
    sourceNodeId: link.sourceNodeId,
    targetNodeId: link.targetNodeId,
    type: link.type,
    logic: link.logic,
    meaning: link.meaning,
    verbalization: link.verbalization,
    assumptionIds: [...(link.assumptionIds || [])].sort(),
    sourceIds: link.sourceIds,
    validation: link.validation
  })).sort(byId),
  assumptions: (tree.assumptions || []).map((assumption) => ({
    id: assumption.id,
    linkId: assumption.linkId,
    statement: assumption.statement,
    status: assumption.status,
    sourceIds: assumption.sourceIds,
    promotedNodeId: assumption.promotedNodeId
  })).sort(byId)
});

const semanticFingerprint = (tree) =>
  createHash("sha256").update(JSON.stringify(semanticSource(tree))).digest("hex");

const projectGoalTree = (tree) => {
  const profile = PROFILE_BY_TREE_TYPE[tree.type];
  if (!profile) {
    throw new LtpError("SEMANTIC_PROFILE_UNSUPPORTED", `Tree type ${tree.type} is not supported by migration ${KERNEL_VERSION}`, {
      treeId: tree.id,
      treeType: tree.type
    });
  }
  if (tree.logicMode !== "necessity") {
    throw new LtpError("SEMANTIC_LOGIC_MODE_UNSUPPORTED", `Goal Tree ${tree.id} must use necessity logic`, {
      treeId: tree.id,
      logicMode: tree.logicMode
    });
  }

  const linkedNodeIds = new Set((tree.links || []).flatMap((link) => [link.sourceNodeId, link.targetNodeId]));
  const elements = [];
  const annotations = [];

  for (const node of tree.nodes || []) {
    const type = ELEMENT_TYPE[node.type];
    if (type) {
      elements.push({ id: node.id, type, statement: node.statement });
      continue;
    }
    if (node.type === "assumption" && !linkedNodeIds.has(node.id)) {
      annotations.push({
        id: node.id,
        type: "PROMOTED_ASSUMPTION",
        statement: node.statement,
        assumptionId: node.promotedFrom?.id || null
      });
      continue;
    }
    throw new LtpError("SEMANTIC_NODE_TYPE_UNSUPPORTED", `Node type ${node.type} cannot be projected safely`, {
      treeId: tree.id,
      nodeId: node.id,
      nodeType: node.type,
      linked: linkedNodeIds.has(node.id)
    });
  }

  const elementIds = new Set(elements.map((element) => element.id));
  const relations = (tree.links || []).map((link) => {
    if (!elementIds.has(link.sourceNodeId) || !elementIds.has(link.targetNodeId)) {
      throw new LtpError("SEMANTIC_RELATION_ENDPOINT_UNSUPPORTED", `Link ${link.id} references a non-semantic annotation`, {
        treeId: tree.id,
        linkId: link.id
      });
    }
    if (link.type !== "necessity" || link.logic !== "necessity") {
      throw new LtpError("SEMANTIC_RELATION_UNSUPPORTED", `Link ${link.id} is not a Goal Tree necessity relation`, {
        treeId: tree.id,
        linkId: link.id,
        type: link.type,
        logic: link.logic
      });
    }
    return {
      id: link.id,
      type: "NECESSITY",
      combination: "SIMPLE",
      renderMode: "IMPLICIT",
      inputs: [{ elementId: link.sourceNodeId }],
      outputs: [{ elementId: link.targetNodeId }]
    };
  }).sort(byId);

  const relationIds = new Set(relations.map((relation) => relation.id));
  const assumptions = (tree.assumptions || []).map((assumption) => {
    if (!relationIds.has(assumption.linkId)) {
      throw new LtpError("SEMANTIC_ASSUMPTION_SUBJECT_MISSING", `Assumption ${assumption.id} references an unknown relation`, {
        treeId: tree.id,
        assumptionId: assumption.id,
        relationId: assumption.linkId
      });
    }
    return {
      id: assumption.id,
      statement: assumption.statement,
      status: assumption.status,
      subject: { kind: "RELATION", relationId: assumption.linkId }
    };
  }).sort(byId);

  const semanticGraph = {
    kernelVersion: KERNEL_VERSION,
    contractVersion: CONTRACT_VERSION,
    profile,
    logicMode: LOGIC_MODE[tree.logicMode],
    sourceFingerprint: semanticFingerprint(tree),
    elements: elements.sort(byId),
    relations,
    assumptions,
    derivations: [],
    annotations: annotations.sort(byId)
  };
  assertSemanticGraph(semanticGraph);
  return semanticGraph;
};

const projectTreeToSemantic = (tree) => projectGoalTree(tree);

const addSemanticKernel = (source) => {
  const workspace = clone(source);
  const migratedTreeIds = [];

  for (const tree of workspace.trees || []) {
    if (!PROFILE_BY_TREE_TYPE[tree.type]) continue;
    if (tree.semanticKernel) {
      const currentFingerprint = semanticFingerprint(tree);
      if (tree.semanticKernel.sourceFingerprint !== currentFingerprint) {
        throw new LtpError("SEMANTIC_MIGRATION_STALE", `Tree ${tree.id} changed after its semantic projection was created`, {
          treeId: tree.id,
          expectedFingerprint: tree.semanticKernel.sourceFingerprint,
          currentFingerprint
        });
      }
      continue;
    }
    tree.semanticKernel = projectTreeToSemantic(tree);
    migratedTreeIds.push(tree.id);
  }

  return { workspace, changed: migratedTreeIds.length > 0, migratedTreeIds };
};

const removeSemanticKernel = (source) => {
  const workspace = clone(source);
  const migratedTreeIds = [];
  for (const tree of workspace.trees || []) {
    if (!tree.semanticKernel) continue;
    delete tree.semanticKernel;
    migratedTreeIds.push(tree.id);
  }
  return { workspace, changed: migratedTreeIds.length > 0, migratedTreeIds };
};

const refreshSemanticProjections = (workspace) => {
  const refreshedTreeIds = [];
  for (const tree of workspace.trees || []) {
    if (!tree.semanticKernel) continue;
    if (tree.semanticKernel.sourceFingerprint === semanticFingerprint(tree)) continue;
    tree.semanticKernel = projectTreeToSemantic(tree);
    refreshedTreeIds.push(tree.id);
  }
  return refreshedTreeIds;
};

module.exports = {
  KERNEL_VERSION,
  CONTRACT_VERSION,
  addSemanticKernel,
  projectTreeToSemantic,
  refreshSemanticProjections,
  removeSemanticKernel,
  semanticFingerprint
};
