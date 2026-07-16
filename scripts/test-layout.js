const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { runComposedLayout, validateComposedGeometry, boxContains, boxesOverlap } = require("../src/core/composed-layout");

const fixturePath = path.join(__dirname, "..", "outputs", "sample-workspace-v0.1.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const complexFixturePath = path.join(__dirname, "..", "outputs", "complex-goal-tree-workspace-v0.1.json");
const complexFixture = JSON.parse(fs.readFileSync(complexFixturePath, "utf8"));

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
    for (const link of treeFor(laidOut).links) {
      const route = treeFor(laidOut).layout.links[link.id].route;
      const source = treeFor(laidOut).layout.nodes[link.sourceNodeId];
      const target = treeFor(laidOut).layout.nodes[link.targetNodeId];
      if (direction === "TB") {
        assert.equal(route[0].y, source.y + source.height, "TB links leave through the source bottom");
        assert.equal(route.at(-1).y, target.y, "TB links enter through the target top");
      } else if (direction === "BT") {
        assert.equal(route[0].y, source.y, "BT links leave through the source top");
        assert.equal(route.at(-1).y, target.y + target.height, "BT links enter through the target bottom");
      } else if (direction === "LR") {
        assert.equal(route[0].x, source.x + source.width, "LR links leave through the source right");
        assert.equal(route.at(-1).x, target.x, "LR links enter through the target left");
      } else {
        assert.equal(route[0].x, source.x, "RL links leave through the source left");
        assert.equal(route.at(-1).x, target.x + target.width, "RL links enter through the target right");
      }
    }
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
    width: 5000,
    height: 5000,
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
  assert(hostBox.width < 5000 && hostBox.height < 5000, "pinned frames must refit their size to content");
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

  const direct = structuredClone(fixture);
  const directTree = treeFor(direct);
  const directCanvas = canvasFor(direct);
  const directRoot = frameFor(direct, directCanvas.rootFrameId);
  const directHost = frameFor(direct, directTree.hostFrameId);
  directTree.nodes = directTree.nodes.slice(0, 10);
  const directNodeIds = directTree.nodes.map((node) => node.id);
  const [goalId, firstId, secondId, thirdId, fourthId, fifthId, sixthId, seventhId, eighthId, shortcutId] = directNodeIds;
  directTree.links = [
    { id: "direct-a", sourceNodeId: firstId, targetNodeId: goalId },
    { id: "direct-b", sourceNodeId: secondId, targetNodeId: goalId },
    { id: "direct-c", sourceNodeId: thirdId, targetNodeId: goalId },
    { id: "direct-d", sourceNodeId: fourthId, targetNodeId: firstId },
    { id: "direct-e", sourceNodeId: fifthId, targetNodeId: firstId },
    { id: "direct-f", sourceNodeId: sixthId, targetNodeId: secondId },
    { id: "direct-g", sourceNodeId: seventhId, targetNodeId: thirdId },
    { id: "direct-h", sourceNodeId: sixthId, targetNodeId: firstId },
    { id: "direct-i", sourceNodeId: eighthId, targetNodeId: thirdId },
    { id: "direct-j", sourceNodeId: shortcutId, targetNodeId: goalId },
    { id: "direct-k", sourceNodeId: shortcutId, targetNodeId: sixthId }
  ];
  directTree.layout.direction = "BT";
  directTree.layout.nodes = Object.fromEntries(
    Object.entries(directTree.layout.nodes).filter(([id]) => directNodeIds.includes(id))
  );
  directTree.layout.links = {};
  directCanvas.frames = [directRoot, directHost];
  directRoot.childFrameIds = [directHost.id];
  directHost.childFrameIds = [];
  directHost.nodeIds = directNodeIds;
  directTree.nodes.forEach((node) => {
    node.frameId = directHost.id;
  });
  directCanvas.layout.frames = {
    [directHost.id]: { x: 60, y: 60, width: 1800, height: 900, pinned: true, layoutSource: "manual" }
  };
  const directResult = await runComposedLayout(direct);
  const directRoutes = directTree.links.map((link) => treeFor(directResult).layout.links[link.id].route);
  const directLayout = treeFor(directResult).layout;
  const directLayerPositions = directNodeIds
    .map((nodeId) => directLayout.nodes[nodeId].y + directLayout.nodes[nodeId].height / 2)
    .sort((left, right) => left - right);
  const directLayerCount = directLayerPositions.reduce(
    (state, position) =>
      position - state.last > 48 ? { count: state.count + 1, last: position } : state,
    { count: 0, last: Number.NEGATIVE_INFINITY }
  ).count;
  assert(directRoutes.every((route) => route.length === 2), "the optimized complex tree should keep every link straight");
  assert.deepEqual(validateComposedGeometry(directResult), [], "straight routes must preserve every geometry invariant");
  assert.equal(directLayout.quality.crossings, 0, "the optimized complex tree should have no route crossings");
  assert.equal(directLayout.quality.bends, 0, "the optimized complex tree should not introduce bends");
  assert.equal(directLayout.quality.directionExceptions, 1, "one secondary link may oppose the preferred direction");
  assert.equal(directLayerCount, 3, "direction relaxation should avoid an unnecessary fourth layer");
  assert.equal(directLayout.optimization[directHost.id].candidates, 9, "the optimizer should compare every deterministic candidate");
  assert(canvasFor(directResult).layout.frames[directHost.id].width < 1800, "the host frame should shrink to its content");

  const complexResult = await runComposedLayout(complexFixture);
  const complexTree = treeFor(complexResult);
  const complexGoal = complexTree.nodes.find((node) => node.type === "goal");
  const complexCsfs = complexTree.nodes.filter((node) => node.type === "criticalSuccessFactor");
  const csfGoalLinks = complexTree.links.filter(
    (link) => complexCsfs.some((node) => node.id === link.sourceNodeId) && link.targetNodeId === complexGoal.id
  );
  const goalArrivals = csfGoalLinks.map((link) => complexTree.layout.links[link.id].route.at(-1));
  const distinctGoalArrivals = new Set(goalArrivals.map((point) => `${point.x}:${point.y}`));
  const goalBox = complexTree.layout.nodes[complexGoal.id];
  const csfRows = new Set(complexCsfs.map((node) => complexTree.layout.nodes[node.id].y));
  const complexOptimization = complexTree.layout.optimization[complexTree.hostFrameId];
  const initialComplexNodes = treeFor(complexFixture).layout.nodes;
  const preservedComplexNodes = complexTree.layout.nodes;
  const complexAnchorId = complexTree.nodes[0].id;
  const relativePositionsPreserved = complexTree.nodes.every((node) => {
    const initial = initialComplexNodes[node.id];
    const initialAnchor = initialComplexNodes[complexAnchorId];
    const result = preservedComplexNodes[node.id];
    const resultAnchor = preservedComplexNodes[complexAnchorId];
    return (
      result.x - resultAnchor.x === initial.x - initialAnchor.x &&
      result.y - resultAnchor.y === initial.y - initialAnchor.y
    );
  });
  assert.equal(complexTree.nodes.length, 18, "the permanent complex fixture should retain all reference entities");
  assert.equal(complexTree.links.length, 21, "the permanent complex fixture should retain cross-branch links");
  assert.equal(csfGoalLinks.length, 3, "all three CSFs must point directly to the Goal");
  assert.equal(csfRows.size, 1, "all three CSFs must share their semantic layer");
  assert([...complexCsfs].every((node) => complexTree.layout.nodes[node.id].y > goalBox.y), "BT places the CSF layer below the Goal");
  assert.equal(distinctGoalArrivals.size, 3, "CSF arrowheads must use distinct arrival points on the Goal");
  assert(goalArrivals.every((point) => point.y === goalBox.y + goalBox.height), "BT arrows must enter through the Goal bottom edge");
  assert.deepEqual(validateComposedGeometry(complexResult), [], "the complex fixture must preserve composed geometry");
  assert.equal(complexTree.layout.quality.crossings, 0, "the complex fixture should avoid independent route crossings");
  assert(complexTree.layout.quality.straightRoutes >= 18, "the stable complex fixture should keep most routes straight");
  assert(complexTree.layout.quality.bends <= 8, "preserving the mental map should not create excessive bends");
  assert.equal(complexOptimization.preserved, true, "a marginal or negative ELK result must preserve the current layout");
  assert(complexOptimization.improvement < 0.15, "the preserved layout must remain below the clear-improvement threshold");
  assert(relativePositionsPreserved, "preserving the current layout must keep every relative node position");

  const scattered = structuredClone(complexFixture);
  const scatteredTree = treeFor(scattered);
  scatteredTree.nodes.forEach((node, index) => {
    scatteredTree.layout.nodes[node.id].x = 80 + index * 430;
    scatteredTree.layout.nodes[node.id].y = 80 + (index % 3) * 220;
  });
  const scatteredResult = await runComposedLayout(scattered);
  const scatteredOptimization = treeFor(scatteredResult).layout.optimization[scatteredTree.hostFrameId];
  assert.equal(scatteredOptimization.preserved, false, "a clearly inferior current layout must be replaced");
  assert(scatteredOptimization.improvement >= 0.15, "ELK must clear the 15% threshold before replacing current positions");
  assert.deepEqual(validateComposedGeometry(scatteredResult), [], "the improved scattered layout must remain geometrically valid");

  console.log("Composed layout tests passed: weighted quality, 15% stability gate, directional ports, routing, frames, nesting and determinism.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
