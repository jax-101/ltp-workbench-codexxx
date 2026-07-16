const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { runComposedLayout, validateComposedGeometry, boxContains, boxesOverlap } = require("../src/core/composed-layout");

const fixturePath = path.join(__dirname, "..", "outputs", "sample-workspace-v0.1.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

const canvasFor = (workspace) => workspace.canvases[0];
const treeFor = (workspace) => workspace.trees[0];
const frameFor = (workspace, frameId) => canvasFor(workspace).frames.find((frame) => frame.id === frameId);

const moveNode = (workspace, nodeId, targetFrameId) => {
  const tree = treeFor(workspace);
  const canvas = canvasFor(workspace);
  const node = tree.nodes.find((candidate) => candidate.id === nodeId);
  for (const frame of canvas.frames) frame.nodeIds = frame.nodeIds.filter((id) => id !== nodeId);
  frameFor(workspace, targetFrameId).nodeIds.push(nodeId);
  node.frameId = targetFrameId;
};

const moveFrame = (workspace, frameId, targetFrameId) => {
  const frame = frameFor(workspace, frameId);
  const previousParent = frameFor(workspace, frame.parentFrameId);
  previousParent.childFrameIds = previousParent.childFrameIds.filter((id) => id !== frameId);
  frameFor(workspace, targetFrameId).childFrameIds.push(frameId);
  frame.parentFrameId = targetFrameId;
};

const run = async () => {
  const fixtureSnapshot = JSON.stringify(fixture);
  for (const direction of ["TB", "BT", "LR", "RL"]) {
    const directional = structuredClone(fixture);
    treeFor(directional).layout.direction = direction;
    const laidOut = await runComposedLayout(directional);
    assert.deepEqual(validateComposedGeometry(laidOut), [], `${direction} layout must satisfy composed geometry`);
    assert.equal(treeFor(laidOut).layout.engine, "elk-composed");
    assert.equal(treeFor(laidOut).layout.direction, direction);
  }
  assert.equal(JSON.stringify(fixture), fixtureSnapshot, "layout must not mutate its input");

  const composed = structuredClone(fixture);
  const tree = treeFor(composed);
  const canvas = canvasFor(composed);
  const rootId = canvas.rootFrameId;
  const hostId = tree.hostFrameId;
  const thinkingId = "frame-csf-thinking";
  const keyboardId = "frame-csf-keyboard";
  const persistenceId = "frame-csf-persistence";
  moveNode(composed, "node-csf-thinking", rootId);
  moveFrame(composed, keyboardId, persistenceId);
  canvas.frames.push({
    id: "frame-empty-test",
    canvasId: canvas.id,
    treeId: null,
    kind: "container",
    parentFrameId: rootId,
    name: "Empty frame",
    semanticType: "visualGroup",
    collapsed: false,
    childFrameIds: [],
    nodeIds: [],
    notes: ""
  });
  frameFor(composed, rootId).childFrameIds.push("frame-empty-test");
  canvas.layout.frames["frame-empty-test"] = {
    x: 140,
    y: 140,
    width: 320,
    height: 180,
    pinned: false,
    layoutSource: "manual"
  };
  canvas.layout.frames[hostId] = {
    ...canvas.layout.frames[hostId],
    x: 44,
    y: 36,
    pinned: true,
    layoutSource: "manual"
  };

  const laidOut = await runComposedLayout(composed);
  assert.deepEqual(validateComposedGeometry(laidOut), []);
  const laidOutCanvas = canvasFor(laidOut);
  const laidOutTree = treeFor(laidOut);
  const hostBox = laidOutCanvas.layout.frames[hostId];
  const movedNodeBox = laidOutTree.layout.nodes["node-csf-thinking"];
  const targetBox = laidOutCanvas.layout.frames[persistenceId];
  const nestedBox = laidOutCanvas.layout.frames[keyboardId];
  const thinkingBox = laidOutCanvas.layout.frames[thinkingId];
  const emptyBox = laidOutCanvas.layout.frames["frame-empty-test"];

  assert.equal(hostBox.x, 44, "pinned root child must retain x");
  assert.equal(hostBox.y, 36, "pinned root child must retain y");
  assert(!boxesOverlap(movedNodeBox, hostBox), "root node must stay outside its former host frame");
  assert(boxContains(targetBox, nestedBox), "nested frame must be fully contained by its new parent");
  assert(!boxesOverlap(thinkingBox, targetBox), "unrelated frame branches must not overlap");
  assert(emptyBox.width >= 300 && emptyBox.height >= 180, "empty frames keep a usable stable size");

  const repeated = await runComposedLayout(laidOut);
  assert.deepEqual(validateComposedGeometry(repeated), [], "repeated layout must remain geometrically valid");
  assert.deepEqual(
    repeated.canvases[0].layout.frames,
    laidOut.canvases[0].layout.frames,
    "composed layout must be deterministic"
  );

  console.log("Composed layout tests passed: directions, nesting, Root, pins, exclusion, empty frames and determinism.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
