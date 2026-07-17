const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { runComposedLayout, validateComposedGeometry } = require("../src/core/composed-layout");
const { projectSemanticGraph } = require("../src/core/semantic-render-projection");
const { validateWorkspace } = require("../src/core/workspace-validator");
const { TransactionEngine } = require("../src/core/transaction-engine");
const { buildEcFixture } = require("./build-ec-fixture");
const { buildMarkdownExport } = require("../src/core/markdown-export");

const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const run = async () => {
  const fixture = buildEcFixture();
  const tree = fixture.trees[0];
  const kernelSnapshot = structuredClone(tree.semanticKernel);
  const projection = projectSemanticGraph(tree.semanticKernel);
  const conflict = projection.links.find((link) => link.id === "rel-d-d-prime");

  assert.equal(tree.nodes.length, 6, "EC must render its six semantic elements directly");
  assert.equal(tree.links.length, 5, "EC must render four necessity arrows and one conflict");
  assert(!tree.nodes.some((node) => node.synthetic?.kind === "JUNCTION"), "a conflict is not a junction");
  assert.equal(conflict.type, "conflict");
  assert.equal(conflict.directionality, "UNDIRECTED");
  assert.equal(conflict.sourceNodeId, "want-small");
  assert.equal(conflict.targetNodeId, "want-large");
  assert.equal(conflict.verbalization, "Produce large batches conflicts with Produce small batches.");
  assert.deepEqual(validateWorkspace(fixture), []);

  const markdown = buildMarkdownExport(tree, fixture.systems[0]);
  assert(markdown.includes("## Relations"));
  assert(markdown.includes("rel-d-d-prime"));
  assert(markdown.includes("The constrained resource lacks a rule"));
  assert(markdown.includes("## Derivations"));
  assert(markdown.includes("assumption-d-prime-c-2"));

  const cli = spawnSync(process.execPath, [
    path.join(__dirname, "ltp-cli.js"),
    "semantic",
    "show",
    "--workspace",
    path.join(__dirname, "..", "outputs", "ec-workspace-v0.1.json"),
    "--tree",
    tree.id,
    "--json"
  ], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  const cliOutput = JSON.parse(cli.stdout);
  assert.equal(cliOutput.graph.diagramType, "EC");
  assert.equal(cliOutput.graph.assumptions.length, 15);

  const laidOut = await runComposedLayout(fixture);
  const laidOutTree = laidOut.trees[0];
  const boxes = laidOutTree.layout.nodes;
  const objective = center(boxes.objective);
  const needFlow = center(boxes["need-flow"]);
  const needCost = center(boxes["need-cost"]);
  const wantSmall = center(boxes["want-small"]);
  const wantLarge = center(boxes["want-large"]);

  assert(wantSmall.x > needFlow.x && needFlow.x > objective.x, "D-B-A must point right to left");
  assert(wantLarge.x > needCost.x && needCost.x > objective.x, "D'-C-A must point right to left");
  assert.equal(wantSmall.y, needFlow.y, "D-B must occupy one parallel lane");
  assert.equal(wantLarge.y, needCost.y, "D'-C must occupy the other parallel lane");
  assert.notEqual(wantSmall.y, wantLarge.y, "the EC branches must remain visually distinct");
  assert.equal(objective.y, (wantSmall.y + wantLarge.y) / 2, "A must sit between the two branches");
  assert.equal(laidOutTree.layout.quality.directionExceptions, 0, "conflict must not count as a reversed causal arrow");
  assert.equal(laidOutTree.layout.optimization[tree.hostFrameId].presentationConstraints, "canonicalRoles");
  assert.deepEqual(laidOutTree.semanticKernel, kernelSnapshot, "layout must not mutate EC semantics");
  assert.deepEqual(validateComposedGeometry(laidOut), []);
  assert.deepEqual(validateWorkspace(laidOut), []);

  const repeated = await runComposedLayout(laidOut);
  assert.deepEqual(repeated.trees[0].layout.nodes, laidOutTree.layout.nodes, "repeated EC layout must be stable");

  const engine = new TransactionEngine(fixture, { clock: () => "2026-07-17T17:00:00+02:00" });
  await engine.execute({
    commandId: "ec-add-conflict-assumption",
    expectedRevision: 0,
    type: "semantic.assumption.create",
    label: "Add EC conflict assumption",
    payload: {
      treeId: tree.id,
      assumption: {
        id: "assumption-conflict-4",
        statement: "The operating rule still treats batch size as a fixed choice",
        subject: { kind: "CONFLICT", relationId: "rel-d-d-prime" }
      }
    }
  });
  assert.equal(engine.getSnapshot().trees[0].semanticKernel.assumptions.length, 16);
  await engine.undo();
  assert.equal(engine.getSnapshot().trees[0].semanticKernel.assumptions.length, 15);
  await engine.redo();
  assert.equal(engine.getSnapshot().trees[0].semanticKernel.assumptions.length, 16);

  console.log("EC cloud passed: native roles, parallel branches, undirected conflict, assumptions and stable canonical layout.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
