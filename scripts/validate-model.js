const fs = require("node:fs");
const path = require("node:path");

const filePath = path.join(__dirname, "..", "outputs", "sample-workspace-v0.1.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
const errors = [];

const requireField = (object, field, label) => {
  if (object[field] === undefined || object[field] === null || object[field] === "") {
    errors.push(`${label} missing ${field}`);
  }
};

requireField(data, "schemaVersion", "workspace fixture");
requireField(data.workspace, "activeSystemId", "workspace");

const system = data.systems.find((item) => item.id === data.workspace.activeSystemId);
if (!system) {
  errors.push("active system not found");
}

if (system) {
  requireField(system, "name", "system");
  requireField(system.profile, "purpose", "system profile");
  requireField(system.profile, "owner", "system profile");
  requireField(system.profile.boundary, "summary", "system boundary");
}

for (const tree of data.trees) {
  const nodeIds = new Set(tree.nodes.map((node) => node.id));
  const frameIds = new Set(tree.frames.map((frame) => frame.id));
  const linkIds = new Set(tree.links.map((link) => link.id));
  const assumptionIds = new Set(tree.assumptions.map((assumption) => assumption.id));

  if (!frameIds.has(tree.rootFrameId)) {
    errors.push(`${tree.id} root frame missing`);
  }

  for (const frame of tree.frames) {
    if (frame.parentFrameId && !frameIds.has(frame.parentFrameId)) {
      errors.push(`${frame.id} parent frame missing`);
    }
    for (const childFrameId of frame.childFrameIds) {
      if (!frameIds.has(childFrameId)) {
        errors.push(`${frame.id} child frame missing: ${childFrameId}`);
      }
    }
    for (const nodeId of frame.nodeIds) {
      if (!nodeIds.has(nodeId)) {
        errors.push(`${frame.id} node missing: ${nodeId}`);
      }
    }
    if (!tree.layout.frames[frame.id]) {
      errors.push(`${frame.id} layout missing`);
    }
  }

  for (const node of tree.nodes) {
    if (!frameIds.has(node.frameId)) {
      errors.push(`${node.id} frame missing: ${node.frameId}`);
    }
    if (!tree.layout.nodes[node.id]) {
      errors.push(`${node.id} layout missing`);
    }
    requireField(node, "statement", node.id);
  }

  for (const link of tree.links) {
    if (!nodeIds.has(link.sourceNodeId)) {
      errors.push(`${link.id} source missing: ${link.sourceNodeId}`);
    }
    if (!nodeIds.has(link.targetNodeId)) {
      errors.push(`${link.id} target missing: ${link.targetNodeId}`);
    }
    if (!tree.layout.links[link.id]) {
      errors.push(`${link.id} layout missing`);
    }
    requireField(link, "meaning", link.id);
    requireField(link, "verbalization", link.id);
    for (const assumptionId of link.assumptionIds) {
      if (!assumptionIds.has(assumptionId)) {
        errors.push(`${link.id} assumption missing: ${assumptionId}`);
      }
    }
  }

  for (const assumption of tree.assumptions) {
    if (!linkIds.has(assumption.linkId)) {
      errors.push(`${assumption.id} link missing: ${assumption.linkId}`);
    }
    requireField(assumption, "statement", assumption.id);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Model fixture OK: ${data.systems.length} system(s), ${data.trees[0].frames.length} frame(s), ${data.trees[0].nodes.length} node(s), ${data.trees[0].links.length} link(s).`);
