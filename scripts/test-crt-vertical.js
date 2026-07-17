const assert = require("node:assert/strict");
const { runComposedLayout, validateComposedGeometry } = require("../src/core/composed-layout");
const { addSemanticKernel, refreshSemanticProjections, removeSemanticKernel } = require("../src/core/semantic-migration");
const {
  inputSegmentId,
  junctionId,
  outputSegmentId,
  projectSemanticGraph,
  semanticGraphFingerprint
} = require("../src/core/semantic-render-projection");
const { validateWorkspace } = require("../src/core/workspace-validator");
const { TransactionEngine } = require("../src/core/transaction-engine");
const { buildCrtFixture } = require("./build-crt-fixture");
const { buildMarkdownExport } = require("../src/core/markdown-export");

const run = async () => {
  const fixture = buildCrtFixture();
  const tree = fixture.trees[0];
  const kernelSnapshot = structuredClone(tree.semanticKernel);
  const projection = projectSemanticGraph(tree.semanticKernel);
  const reorderedKernel = structuredClone(tree.semanticKernel);
  reorderedKernel.elements.reverse();
  reorderedKernel.relations.reverse();
  reorderedKernel.relations.find((relation) => relation.id === "rel-and-rework").inputs.reverse();
  assert.equal(
    semanticGraphFingerprint(reorderedKernel),
    semanticGraphFingerprint(tree.semanticKernel),
    "semantic fingerprints must ignore non-semantic collection order"
  );

  assert.equal(tree.nodes.length, 10, "nine semantic elements plus one derived junction must render");
  assert.equal(tree.links.length, 11, "eight direct relations plus three AND segments must render");
  assert(tree.nodes.some((node) => node.id === junctionId("rel-and-rework") && node.synthetic?.kind === "JUNCTION"));
  assert(!tree.semanticKernel.elements.some((element) => element.id.startsWith("junction:")), "junctions must not become semantic elements");
  assert(tree.links.some((link) => link.id === inputSegmentId("rel-and-rework", "capacity")));
  assert(tree.links.some((link) => link.id === inputSegmentId("rel-and-rework", "feedback")));
  assert(tree.links.some((link) => link.id === outputSegmentId("rel-and-rework", "rework")));
  assert.deepEqual(projectSemanticGraph(tree.semanticKernel), projection, "semantic projection must be deterministic");
  assert.deepEqual(validateWorkspace(fixture), [], "native CRT fixture must satisfy the workspace contract");
  const markdown = buildMarkdownExport(tree, fixture.systems[0]);
  assert(markdown.includes("## Relations"));
  assert(markdown.includes("rel-and-rework [AND]"));
  assert(markdown.includes("Assumptions:"));
  assert(!markdown.includes("## Critical Success Factors"), "CRT export must not use Goal Tree headings");

  const stale = structuredClone(fixture);
  stale.trees[0].semanticKernel.elements.find((element) => element.id === "delivery").statement = "Deliveries remain late";
  assert(validateWorkspace(stale).some((issue) => issue.code === "SEMANTIC_MIGRATION_STALE"), "semantic changes must invalidate the visual projection");
  const migrationRepair = addSemanticKernel(stale);
  assert.equal(migrationRepair.changed, true, "opening a stale native projection must request persistence of its repair");
  assert.deepEqual(migrationRepair.migratedTreeIds, [tree.id]);
  const preservedBox = structuredClone(stale.trees[0].layout.nodes.delivery);
  refreshSemanticProjections(stale);
  assert.deepEqual(stale.trees[0].layout.nodes.delivery, preservedBox, "projection refresh must preserve the user's spatial position");
  assert.equal(stale.trees[0].nodes.find((node) => node.id === "delivery").statement, "Deliveries remain late");
  assert.equal(stale.trees[0].renderProjection.sourceFingerprint, semanticGraphFingerprint(stale.trees[0].semanticKernel));
  assert.deepEqual(validateWorkspace(stale), []);

  const downgrade = removeSemanticKernel(fixture);
  assert(downgrade.workspace.trees[0].semanticKernel, "migration rollback must never delete a native semantic source");
  assert.equal(downgrade.changed, false);

  const engine = new TransactionEngine(fixture, { clock: () => "2026-07-17T13:00:00+02:00" });
  const execute = (type, payload, label = type) => engine.execute({
    commandId: `crt-${type}-${engine.getHistoryState().revision}`,
    expectedRevision: engine.getHistoryState().revision,
    type,
    label,
    payload
  });
  await execute("semantic.relation.update-endpoints", {
    treeId: tree.id,
    relationId: "rel-and-rework",
    inputs: [{ elementId: "capacity" }, { elementId: "equipment" }],
    outputs: [{ elementId: "rework" }]
  }, "Change AND inputs");
  let editedTree = engine.getSnapshot().trees[0];
  assert.deepEqual(
    editedTree.semanticKernel.relations.find((relation) => relation.id === "rel-and-rework").inputs,
    [{ elementId: "capacity" }, { elementId: "equipment" }]
  );
  assert(editedTree.links.some((link) => link.id === inputSegmentId("rel-and-rework", "equipment")));
  assert(!editedTree.links.some((link) => link.id === inputSegmentId("rel-and-rework", "feedback")));
  await engine.undo();
  editedTree = engine.getSnapshot().trees[0];
  assert(editedTree.links.some((link) => link.id === inputSegmentId("rel-and-rework", "feedback")), "Undo must restore semantic endpoints and projection");
  await engine.redo();
  editedTree = engine.getSnapshot().trees[0];
  assert(editedTree.links.some((link) => link.id === inputSegmentId("rel-and-rework", "equipment")), "Redo must restore the edited projection");

  await execute("semantic.element.create", {
    treeId: tree.id,
    frameId: tree.hostFrameId,
    element: { id: "workaround", type: "ENTITY", statement: "A workaround consumes attention" }
  }, "Create CRT element");
  await execute("semantic.relation.create", {
    treeId: tree.id,
    relation: {
      id: "rel-workaround-expense",
      type: "CAUSALITY",
      combination: "SIMPLE",
      renderMode: "IMPLICIT",
      inputs: [{ elementId: "workaround" }],
      outputs: [{ elementId: "expense" }]
    }
  }, "Create CRT relation");
  await execute("semantic.assumption.create", {
    treeId: tree.id,
    assumption: {
      id: "assumption-workaround",
      statement: "Special handling requires additional effort",
      subject: { kind: "RELATION", relationId: "rel-workaround-expense" }
    }
  }, "Create CRT assumption");
  assert(engine.getSnapshot().trees[0].nodes.some((node) => node.id === "workaround"));
  assert(engine.getSnapshot().trees[0].links.some((link) => link.id === "rel-workaround-expense"));
  await execute("semantic.element.delete", { treeId: tree.id, elementId: "workaround" }, "Delete CRT element");
  editedTree = engine.getSnapshot().trees[0];
  assert(!editedTree.semanticKernel.elements.some((element) => element.id === "workaround"));
  assert(!editedTree.semanticKernel.relations.some((relation) => relation.id === "rel-workaround-expense"));
  assert(!editedTree.semanticKernel.assumptions.some((assumption) => assumption.id === "assumption-workaround"));
  await engine.undo();
  editedTree = engine.getSnapshot().trees[0];
  assert(editedTree.semanticKernel.elements.some((element) => element.id === "workaround"), "Undo must restore a cascaded native deletion");
  assert(editedTree.semanticKernel.relations.some((relation) => relation.id === "rel-workaround-expense"));
  assert(editedTree.semanticKernel.assumptions.some((assumption) => assumption.id === "assumption-workaround"));
  assert.deepEqual(validateWorkspace(engine.getSnapshot()), []);

  const framedFixture = structuredClone(fixture);
  const framedTree = framedFixture.trees[0];
  const framedCanvas = framedFixture.canvases[0];
  const containerFrameId = "frame-crt-capacity";
  framedCanvas.frames.push({
    id: containerFrameId,
    canvasId: framedCanvas.id,
    treeId: framedTree.id,
    kind: "container",
    parentFrameId: framedTree.hostFrameId,
    name: "Capacity causes",
    semanticType: "visualGroup",
    collapsed: false,
    childFrameIds: [],
    nodeIds: ["capacity"],
    notes: ""
  });
  framedCanvas.frames.find((frame) => frame.id === framedTree.hostFrameId).childFrameIds.push(containerFrameId);
  framedCanvas.frames.find((frame) => frame.id === framedTree.hostFrameId).nodeIds =
    framedCanvas.frames.find((frame) => frame.id === framedTree.hostFrameId).nodeIds.filter((id) => id !== "capacity");
  framedCanvas.layout.frames[containerFrameId] = { x: 100, y: 100, width: 340, height: 210, pinned: false, layoutSource: "manual" };
  framedTree.nodes.find((node) => node.id === "capacity").frameId = containerFrameId;
  framedTree.renderProjection.frameByNodeId.capacity = containerFrameId;
  const frameEngine = new TransactionEngine(framedFixture, { clock: () => "2026-07-17T14:00:00+02:00" });
  await frameEngine.execute({
    commandId: "delete-native-crt-frame",
    expectedRevision: 0,
    type: "semantic.frame.delete",
    label: "Delete CRT frame",
    payload: { treeId: framedTree.id, frameId: containerFrameId }
  });
  const frameDeleted = frameEngine.getSnapshot();
  assert(!frameDeleted.canvases[0].frames.some((frame) => frame.id === containerFrameId));
  assert(!frameDeleted.trees[0].semanticKernel.elements.some((element) => element.id === "capacity"));
  assert(!frameDeleted.trees[0].semanticKernel.relations.some((relation) => relation.id === "rel-and-rework"));
  assert.equal(frameDeleted.trees[0].semanticKernel.assumptions.length, 0, "dependent AND assumptions must cascade with the frame");
  await frameEngine.undo();
  const frameRestored = frameEngine.getSnapshot();
  assert(frameRestored.canvases[0].frames.some((frame) => frame.id === containerFrameId));
  assert(frameRestored.trees[0].semanticKernel.elements.some((element) => element.id === "capacity"));
  assert(frameRestored.trees[0].semanticKernel.relations.some((relation) => relation.id === "rel-and-rework"));
  assert.equal(frameRestored.trees[0].semanticKernel.assumptions.length, 2);
  assert.deepEqual(validateWorkspace(frameRestored), []);

  const laidOut = await runComposedLayout(fixture);
  const laidOutTree = laidOut.trees[0];
  assert.deepEqual(laidOutTree.semanticKernel, kernelSnapshot, "layout must not mutate native CRT semantics");
  assert.equal(laidOutTree.layout.direction, "BT");
  assert(laidOutTree.layout.quality.cycleBreaks >= 1, "the negative loop must be broken only for ranking");
  assert.equal(laidOutTree.links.length, 11, "all semantic relations must be restored after cycle ranking");
  assert(laidOutTree.links.every((link) => laidOutTree.layout.links[link.id].route.length >= 2), "every projected segment must have a visible route");
  assert.deepEqual(validateWorkspace(laidOut), []);

  const geometryIssues = validateComposedGeometry(laidOut);
  assert.deepEqual(geometryIssues, [], `CRT layout geometry failed: ${JSON.stringify(geometryIssues)}`);
  const repeated = await runComposedLayout(laidOut);
  assert.deepEqual(repeated.trees[0].layout.nodes, laidOutTree.layout.nodes, "repeated CRT layout must be stable");
  assert.deepEqual(repeated.trees[0].semanticKernel, kernelSnapshot);

  console.log("CRT vertical passed: native semantics, deterministic AND junction, BT cycle-aware layout and stable projection.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
