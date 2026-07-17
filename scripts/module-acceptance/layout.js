const assert = require("node:assert/strict");
const { runComposedLayout, validateComposedGeometry } = require("../../src/core/composed-layout");
const { loadMigratedFixture } = require("./helpers");

const run = async () => {
  const workspace = loadMigratedFixture("complex-goal-tree-workspace-v0.1.json");
  const original = structuredClone(workspace);
  const treeId = workspace.trees[0].id;
  const request = { treeId, now: "2026-07-18T00:00:00.000Z" };
  const first = await runComposedLayout(workspace, request);
  const second = await runComposedLayout(workspace, request);
  assert.deepEqual(workspace, original, "Layout mutated its input");
  assert.deepEqual(first.canvases[0].layout, second.canvases[0].layout, "Layout is not deterministic");
  assert.deepEqual(first.trees[0].layout, second.trees[0].layout, "Tree routes are not deterministic");
  const blocking = validateComposedGeometry(first).filter((issue) =>
    ["NODE_OVERLAP", "UNRELATED_FRAME_OVERLAP", "FRAME_OUTSIDE_PARENT", "LINK_ROUTE_MISSING"].includes(issue.code)
  );
  assert.deepEqual(blocking, []);
};

run().then(() => {
  console.log("Layout acceptance passed: immutable input, deterministic output and valid composed geometry.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
