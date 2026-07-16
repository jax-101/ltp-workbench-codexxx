const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { runComposedLayout, validateComposedGeometry } = require("../src/core/composed-layout");
const { SCENARIOS, generateRandomLayoutFixture } = require("../src/core/random-layout-fixture");

const fixturePath = path.join(__dirname, "..", "outputs", "complex-goal-tree-workspace-v0.1.json");
const sourceFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

const frameDepth = (canvas, frame) => {
  const byId = new Map(canvas.frames.map((candidate) => [candidate.id, candidate]));
  let depth = 0;
  let current = frame;
  while (current?.parentFrameId) {
    depth += 1;
    current = byId.get(current.parentFrameId);
  }
  return depth;
};

const run = async () => {
  const summaries = [];
  for (const scenario of SCENARIOS) {
    const fixture = generateRandomLayoutFixture(sourceFixture, scenario);
    const repeated = generateRandomLayoutFixture(sourceFixture, scenario);
    assert.deepEqual(fixture, repeated, `${scenario.id} generation must be deterministic`);
    const tree = fixture.trees[0];
    const canvas = fixture.canvases[0];
    const frameByNode = new Map(tree.nodes.map((node) => [node.id, node.frameId]));
    const crossFrameLinks = tree.links.filter(
      (link) => frameByNode.get(link.sourceNodeId) !== frameByNode.get(link.targetNodeId)
    ).length;
    assert(crossFrameLinks > 0, `${scenario.id} must exercise cross-frame routing`);
    if (scenario.nested) {
      assert(Math.max(...canvas.frames.map((frame) => frameDepth(canvas, frame))) >= 3, `${scenario.id} must contain a nested frame`);
    }

    const laidOut = await runComposedLayout(fixture);
    const issues = validateComposedGeometry(laidOut);
    const repeatedLayout = await runComposedLayout(fixture);
    assert.deepEqual(
      laidOut.trees[0].layout.nodes,
      repeatedLayout.trees[0].layout.nodes,
      `${scenario.id} node placement must be deterministic`
    );
    assert.deepEqual(
      laidOut.canvases[0].layout.frames,
      repeatedLayout.canvases[0].layout.frames,
      `${scenario.id} frame placement must be deterministic`
    );
    assert.equal(
      Object.keys(laidOut.trees[0].layout.nodes).length,
      tree.nodes.length,
      `${scenario.id} must lay out every node`
    );
    const quality = laidOut.trees[0].layout.quality;
    const issueCodes = issues.reduce((counts, issue) => {
      counts[issue.code] = (counts[issue.code] || 0) + 1;
      return counts;
    }, {});
    summaries.push({
      scenario: scenario.id,
      seed: scenario.seed,
      frames: canvas.frames.length - 1,
      links: tree.links.length,
      crossFrameLinks,
      crossings: quality.crossings,
      bends: quality.bends,
      straightRoutes: quality.straightRoutes,
      directionExceptions: quality.directionExceptions,
      length: quality.length,
      geometryIssues: issues.length,
      issueCodes: Object.entries(issueCodes).map(([code, count]) => `${code}:${count}`).join(", ") || "none"
    });
  }
  console.table(summaries);
  console.log("Randomized layout probe completed: generation and placement are deterministic; geometry issues are reported as visual evidence, not hidden by the test harness.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
