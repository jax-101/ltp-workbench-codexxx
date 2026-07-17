const { LtpError } = require("./errors");
const { semanticFingerprint } = require("./semantic-migration");
const { validateSemanticGraph } = require("./semantic-validator");
const { NATIVE_STORAGE_MODE, semanticGraphFingerprint } = require("./semantic-render-projection");

const validateWorkspace = (workspace) => {
  const issues = [];
  const add = (code, path, message) => issues.push({ code, path, message });
  const requireValue = (value, path) => {
    if (value === undefined || value === null || value === "") add("REQUIRED", path, `${path} is required`);
  };
  const requireUniqueIds = (items, path) => {
    const seen = new Set();
    for (const item of items) {
      if (seen.has(item.id)) add("DUPLICATE_ID", `${path}.${item.id}`, `Duplicate ID ${item.id}`);
      seen.add(item.id);
    }
  };

  if (!workspace || typeof workspace !== "object") {
    add("INVALID_WORKSPACE", "$", "Workspace must be an object");
    return issues;
  }

  requireValue(workspace.schemaVersion, "schemaVersion");
  requireValue(workspace.workspace?.activeSystemId, "workspace.activeSystemId");

  const systems = Array.isArray(workspace.systems) ? workspace.systems : [];
  const trees = Array.isArray(workspace.trees) ? workspace.trees : [];
  const canvases = Array.isArray(workspace.canvases) ? workspace.canvases : [];
  requireUniqueIds(systems, "systems");
  requireUniqueIds(trees, "trees");
  requireUniqueIds(canvases, "canvases");

  if (!systems.some((system) => system.id === workspace.workspace?.activeSystemId)) {
    add("ACTIVE_SYSTEM_MISSING", "workspace.activeSystemId", "Active system does not exist");
  }

  const nodeOwners = new Map();
  for (const tree of trees) {
    for (const node of tree.nodes || []) {
      if (nodeOwners.has(node.id)) add("DUPLICATE_ID", `trees.${tree.id}.nodes.${node.id}`, `Duplicate node ID ${node.id}`);
      nodeOwners.set(node.id, { node, tree });
    }
  }

  const canvasById = new Map(canvases.map((canvas) => [canvas.id, canvas]));
  for (const canvas of canvases) {
    const canvasPath = `canvases.${canvas.id || "unknown"}`;
    const frames = Array.isArray(canvas.frames) ? canvas.frames : [];
    const frameIds = new Set(frames.map((frame) => frame.id));
    const frameById = new Map(frames.map((frame) => [frame.id, frame]));
    requireUniqueIds(frames, `${canvasPath}.frames`);

    const root = frameById.get(canvas.rootFrameId);
    if (!systems.some((system) => system.id === canvas.systemId)) {
      add("CANVAS_SYSTEM_MISSING", `${canvasPath}.systemId`, `System ${canvas.systemId} does not exist`);
    }
    if (!root) add("ROOT_FRAME_MISSING", `${canvasPath}.rootFrameId`, "Canvas root frame does not exist");
    if (root?.kind !== "root") add("ROOT_FRAME_KIND", `${canvasPath}.rootFrameId`, "Canvas root frame must have kind root");
    if (root?.parentFrameId) add("ROOT_FRAME_HAS_PARENT", `${canvasPath}.rootFrameId`, "Canvas root frame cannot have a parent");

    for (const frame of frames) {
      const framePath = `${canvasPath}.frames.${frame.id}`;
      if (frame.canvasId !== canvas.id) add("FRAME_CANVAS_MISMATCH", `${framePath}.canvasId`, "Frame points to another canvas");
      if (frame.id !== canvas.rootFrameId && !frame.parentFrameId) {
        add("FRAME_PARENT_REQUIRED", `${framePath}.parentFrameId`, "Every finite frame must have a parent");
      }
      if (frame.parentFrameId && !frameIds.has(frame.parentFrameId)) {
        add("PARENT_FRAME_MISSING", `${framePath}.parentFrameId`, `Parent frame ${frame.parentFrameId} does not exist`);
      } else if (frame.parentFrameId && !(frameById.get(frame.parentFrameId)?.childFrameIds || []).includes(frame.id)) {
        add("FRAME_HIERARCHY_MISMATCH", `${framePath}.parentFrameId`, `Parent frame ${frame.parentFrameId} does not reference this child`);
      }
      for (const childFrameId of frame.childFrameIds || []) {
        const child = frameById.get(childFrameId);
        if (!child) add("CHILD_FRAME_MISSING", `${framePath}.childFrameIds`, `Child frame ${childFrameId} does not exist`);
        else if (child.parentFrameId !== frame.id) {
          add("FRAME_HIERARCHY_MISMATCH", `${framePath}.childFrameIds`, `Child frame ${childFrameId} points to another parent`);
        }
      }
      for (const nodeId of frame.nodeIds || []) {
        const owner = nodeOwners.get(nodeId);
        if (!owner) add("FRAME_NODE_MISSING", `${framePath}.nodeIds`, `Node ${nodeId} does not exist`);
        else if (owner.node.frameId !== frame.id) {
          add("NODE_MEMBERSHIP_MISMATCH", `${framePath}.nodeIds`, `Node ${nodeId} points to another frame`);
        }
      }
      if (frame.id !== canvas.rootFrameId && !canvas.layout?.frames?.[frame.id]) {
        add("FRAME_LAYOUT_MISSING", `${canvasPath}.layout.frames.${frame.id}`, "Frame layout is missing");
      }

      const visited = new Set([frame.id]);
      let parentId = frame.parentFrameId;
      while (parentId) {
        if (visited.has(parentId)) {
          add("FRAME_HIERARCHY_CYCLE", `${framePath}.parentFrameId`, "Frame hierarchy contains a cycle");
          break;
        }
        visited.add(parentId);
        parentId = frameById.get(parentId)?.parentFrameId;
      }
    }
  }

  for (const tree of trees) {
    const treePath = `trees.${tree.id || "unknown"}`;
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];
    const links = Array.isArray(tree.links) ? tree.links : [];
    const assumptions = Array.isArray(tree.assumptions) ? tree.assumptions : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const linkIds = new Set(links.map((link) => link.id));
    const assumptionIds = new Set(assumptions.map((assumption) => assumption.id));
    const canvas = canvasById.get(tree.canvasId);
    const frames = canvas?.frames || [];
    const frameIds = new Set(frames.map((frame) => frame.id));
    const hostFrame = frames.find((frame) => frame.id === tree.hostFrameId);

    if (tree.semanticKernel) {
      for (const semanticIssue of validateSemanticGraph(tree.semanticKernel).filter((issue) => issue.severity === "ERROR")) {
        add(
          `SEMANTIC_${semanticIssue.code}`,
          `${treePath}.semanticKernel.${semanticIssue.path}`,
          semanticIssue.message
        );
      }
      const nativeSemantic = tree.semanticKernel.storageMode === NATIVE_STORAGE_MODE;
      const currentFingerprint = nativeSemantic
        ? semanticGraphFingerprint(tree.semanticKernel)
        : semanticFingerprint(tree);
      const projectedFingerprint = nativeSemantic
        ? tree.renderProjection?.sourceFingerprint
        : tree.semanticKernel.sourceFingerprint;
      if (projectedFingerprint !== currentFingerprint) {
        add(
          "SEMANTIC_MIGRATION_STALE",
          nativeSemantic ? `${treePath}.renderProjection.sourceFingerprint` : `${treePath}.semanticKernel.sourceFingerprint`,
          nativeSemantic ? "Visual projection is older than its semantic source" : "Semantic projection is older than its legacy source"
        );
      }
    }

    requireUniqueIds(nodes, `${treePath}.nodes`);
    requireUniqueIds(links, `${treePath}.links`);
    requireUniqueIds(assumptions, `${treePath}.assumptions`);
    if (!canvas) add("TREE_CANVAS_MISSING", `${treePath}.canvasId`, `Canvas ${tree.canvasId} does not exist`);
    else if (canvas.systemId !== tree.systemId) add("TREE_CANVAS_SYSTEM_MISMATCH", `${treePath}.canvasId`, "Tree and canvas belong to different systems");
    if (!hostFrame) add("HOST_FRAME_MISSING", `${treePath}.hostFrameId`, `Host frame ${tree.hostFrameId} does not exist`);
    else {
      if (hostFrame.kind !== "diagram") add("HOST_FRAME_KIND", `${treePath}.hostFrameId`, "Tree host frame must have kind diagram");
      if (hostFrame.treeId !== tree.id) add("HOST_FRAME_TREE_MISMATCH", `${treePath}.hostFrameId`, "Host frame points to another tree");
    }

    for (const node of nodes) {
      const nodePath = `${treePath}.nodes.${node.id}`;
      if (!frameIds.has(node.frameId)) add("NODE_FRAME_MISSING", `${nodePath}.frameId`, `Frame ${node.frameId} does not exist`);
      const nodeFrame = frames.find((frame) => frame.id === node.frameId);
      if (nodeFrame?.treeId && nodeFrame.treeId !== tree.id) {
        add("NODE_FRAME_TREE_MISMATCH", `${nodePath}.frameId`, `Frame ${node.frameId} belongs to another tree`);
      }
      const memberships = frames.filter((frame) => (frame.nodeIds || []).includes(node.id));
      if (memberships.length !== 1) add("NODE_MEMBERSHIP_COUNT", nodePath, `Node must belong to exactly one frame, found ${memberships.length}`);
      if (!tree.layout?.nodes?.[node.id]) add("NODE_LAYOUT_MISSING", `${treePath}.layout.nodes.${node.id}`, "Node layout is missing");
      requireValue(node.statement, `${nodePath}.statement`);
    }

    for (const link of links) {
      const linkPath = `${treePath}.links.${link.id}`;
      if (!nodeIds.has(link.sourceNodeId)) add("LINK_SOURCE_MISSING", `${linkPath}.sourceNodeId`, `Source ${link.sourceNodeId} does not exist`);
      if (!nodeIds.has(link.targetNodeId)) add("LINK_TARGET_MISSING", `${linkPath}.targetNodeId`, `Target ${link.targetNodeId} does not exist`);
      if (!tree.layout?.links?.[link.id]) add("LINK_LAYOUT_MISSING", `${treePath}.layout.links.${link.id}`, "Link layout is missing");
      requireValue(link.meaning, `${linkPath}.meaning`);
      requireValue(link.verbalization, `${linkPath}.verbalization`);
      for (const assumptionId of link.assumptionIds || []) {
        if (!assumptionIds.has(assumptionId)) add("LINK_ASSUMPTION_MISSING", `${linkPath}.assumptionIds`, `Assumption ${assumptionId} does not exist`);
      }
    }

    for (const assumption of assumptions) {
      const assumptionPath = `${treePath}.assumptions.${assumption.id}`;
      if (!linkIds.has(assumption.linkId)) add("ASSUMPTION_LINK_MISSING", `${assumptionPath}.linkId`, `Link ${assumption.linkId} does not exist`);
      requireValue(assumption.statement, `${assumptionPath}.statement`);
    }
  }

  return issues;
};

const assertWorkspace = (workspace) => {
  const issues = validateWorkspace(workspace);
  if (issues.length) {
    throw new LtpError("WORKSPACE_INVALID", `Workspace validation failed with ${issues.length} issue(s)`, { issues });
  }
  return workspace;
};

module.exports = { validateWorkspace, assertWorkspace };
