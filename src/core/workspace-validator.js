const { LtpError } = require("./errors");

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
  if (!systems.some((system) => system.id === workspace.workspace?.activeSystemId)) {
    add("ACTIVE_SYSTEM_MISSING", "workspace.activeSystemId", "Active system does not exist");
  }

  for (const tree of trees) {
    const treePath = `trees.${tree.id || "unknown"}`;
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];
    const frames = Array.isArray(tree.frames) ? tree.frames : [];
    const links = Array.isArray(tree.links) ? tree.links : [];
    const assumptions = Array.isArray(tree.assumptions) ? tree.assumptions : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const frameIds = new Set(frames.map((frame) => frame.id));
    const linkIds = new Set(links.map((link) => link.id));
    const assumptionIds = new Set(assumptions.map((assumption) => assumption.id));

    requireUniqueIds(nodes, `${treePath}.nodes`);
    requireUniqueIds(frames, `${treePath}.frames`);
    requireUniqueIds(links, `${treePath}.links`);
    requireUniqueIds(assumptions, `${treePath}.assumptions`);

    if (!frameIds.has(tree.rootFrameId)) add("ROOT_FRAME_MISSING", `${treePath}.rootFrameId`, "Root frame does not exist");
    const rootFrame = frames.find((frame) => frame.id === tree.rootFrameId);
    if (rootFrame?.parentFrameId) add("ROOT_FRAME_HAS_PARENT", `${treePath}.rootFrameId`, "Root frame cannot have a parent");

    for (const frame of frames) {
      const visited = new Set([frame.id]);
      let parentId = frame.parentFrameId;
      while (parentId) {
        if (visited.has(parentId)) {
          add("FRAME_HIERARCHY_CYCLE", `${treePath}.frames.${frame.id}.parentFrameId`, "Frame hierarchy contains a cycle");
          break;
        }
        visited.add(parentId);
        parentId = frames.find((candidate) => candidate.id === parentId)?.parentFrameId;
      }
    }

    for (const frame of frames) {
      const framePath = `${treePath}.frames.${frame.id}`;
      if (frame.parentFrameId && !frameIds.has(frame.parentFrameId)) {
        add("PARENT_FRAME_MISSING", `${framePath}.parentFrameId`, `Parent frame ${frame.parentFrameId} does not exist`);
      }
      for (const childFrameId of frame.childFrameIds || []) {
        const child = frames.find((candidate) => candidate.id === childFrameId);
        if (!child) add("CHILD_FRAME_MISSING", `${framePath}.childFrameIds`, `Child frame ${childFrameId} does not exist`);
        else if (child.parentFrameId !== frame.id) {
          add("FRAME_HIERARCHY_MISMATCH", `${framePath}.childFrameIds`, `Child frame ${childFrameId} points to another parent`);
        }
      }
      for (const nodeId of frame.nodeIds || []) {
        const node = nodes.find((candidate) => candidate.id === nodeId);
        if (!node) add("FRAME_NODE_MISSING", `${framePath}.nodeIds`, `Node ${nodeId} does not exist`);
        else if (node.frameId !== frame.id) {
          add("NODE_MEMBERSHIP_MISMATCH", `${framePath}.nodeIds`, `Node ${nodeId} points to another frame`);
        }
      }
      if (!tree.layout?.frames?.[frame.id]) add("FRAME_LAYOUT_MISSING", `${treePath}.layout.frames.${frame.id}`, "Frame layout is missing");
    }

    for (const node of nodes) {
      const nodePath = `${treePath}.nodes.${node.id}`;
      if (!frameIds.has(node.frameId)) add("NODE_FRAME_MISSING", `${nodePath}.frameId`, `Frame ${node.frameId} does not exist`);
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
