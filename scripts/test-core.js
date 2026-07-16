const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { TransactionEngine } = require("../src/core/transaction-engine");
const { WorkspaceRepository } = require("../src/core/workspace-repository");
const { getDiagramDefinition, getNodeTypeDefinition } = require("../src/core/diagram-registry");
const { selectionClosure } = require("../src/core/selection-model");
const { migrateWorkspace } = require("../src/core/workspace-migrations");
const { validateWorkspace } = require("../src/core/workspace-validator");

const fixturePath = path.join(__dirname, "..", "outputs", "sample-workspace-v0.1.json");
const fixture = JSON.parse(require("node:fs").readFileSync(fixturePath, "utf8"));
const originalNode = fixture.trees[0].nodes[0];

const command = (overrides = {}) => ({
  commandId: "command-update-node",
  type: "node.update",
  label: "Edit goal",
  category: "content.edit",
  expectedRevision: 0,
  payload: {
    treeId: fixture.trees[0].id,
    nodeId: originalNode.id,
    field: "statement",
    value: "Updated transactionally"
  },
  ...overrides
});

const run = async () => {
  const goalTreeDefinition = getDiagramDefinition("goalTree");
  assert.equal(goalTreeDefinition.defaultDirection, "TB");
  assert.deepEqual(goalTreeDefinition.nodeTypes.map((type) => type.id), [
    "goal",
    "criticalSuccessFactor",
    "necessaryCondition",
    "assumption"
  ]);
  assert.equal(getNodeTypeDefinition("goalTree", "criticalSuccessFactor").shortLabel, "CSF");

  const fixtureTree = fixture.trees[0];
  const fixtureCanvas = fixture.canvases.find((canvas) => canvas.id === fixtureTree.canvasId);
  const hostSelection = new Set(selectionClosure(fixtureTree, [fixtureTree.hostFrameId], fixtureCanvas.frames));
  const treeFrames = fixtureCanvas.frames.filter((frame) => frame.treeId === fixtureTree.id);
  assert.equal(hostSelection.size, treeFrames.length + fixtureTree.nodes.length + fixtureTree.links.length);
  assert.deepEqual(selectionClosure(fixtureTree, [fixtureTree.nodes[0].id]), [fixtureTree.nodes[0].id]);
  const childFrame = fixtureCanvas.frames.find((frame) => frame.parentFrameId === fixtureTree.hostFrameId);
  const childSelection = new Set(selectionClosure(fixtureTree, [childFrame.id], fixtureCanvas.frames));
  const childNodeIds = new Set(fixtureTree.nodes.filter((node) => node.frameId === childFrame.id).map((node) => node.id));
  assert(childSelection.has(childFrame.id));
  assert([...childNodeIds].every((id) => childSelection.has(id)));
  assert(
    fixtureTree.links
      .filter((link) => childNodeIds.has(link.sourceNodeId) && childNodeIds.has(link.targetNodeId))
      .every((link) => childSelection.has(link.id))
  );

  const legacyFixture = structuredClone(fixture);
  const legacyTree = legacyFixture.trees[0];
  const legacyCanvas = legacyFixture.canvases[0];
  legacyFixture.schemaVersion = "0.1";
  legacyTree.schemaVersion = "0.1";
  legacyTree.rootFrameId = legacyTree.hostFrameId;
  legacyTree.frames = legacyCanvas.frames
    .filter((frame) => frame.id !== legacyCanvas.rootFrameId)
    .map(({ canvasId, kind, ...frame }) => ({ ...frame, parentFrameId: frame.id === legacyTree.hostFrameId ? null : frame.parentFrameId }));
  legacyTree.layout.frames = structuredClone(legacyCanvas.layout.frames);
  legacyTree.viewState = structuredClone(legacyCanvas.viewState);
  delete legacyTree.canvasId;
  delete legacyTree.hostFrameId;
  delete legacyFixture.canvases;
  const migrated = migrateWorkspace(legacyFixture);
  assert.equal(migrated.changed, true);
  assert.equal(migrated.workspace.trees[0].hostFrameId, fixtureTree.hostFrameId);
  assert.equal(migrated.workspace.canvases[0].frames.length, fixtureCanvas.frames.length);
  assert.deepEqual(migrated.workspace.trees[0].nodes, fixtureTree.nodes);
  assert.equal(migrateWorkspace(migrated.workspace).changed, false, "migration must be idempotent");
  const disconnectedFixture = structuredClone(fixture);
  disconnectedFixture.canvases[0].frames.find((frame) => frame.kind === "root").childFrameIds = [];
  assert(
    validateWorkspace(disconnectedFixture).some((issue) => issue.code === "FRAME_HIERARCHY_MISMATCH"),
    "validator must reject a one-sided frame hierarchy"
  );
  assert(
    fixtureTree.links
      .filter((link) => childNodeIds.has(link.sourceNodeId) !== childNodeIds.has(link.targetNodeId))
      .every((link) => !childSelection.has(link.id))
  );

  const typeCycleNodeIds = fixtureTree.nodes
    .filter((node) => node.type === "necessaryCondition")
    .slice(0, 2)
    .map((node) => node.id);
  const typeCycleEngine = new TransactionEngine(fixture);
  const synchronizedTypes = await typeCycleEngine.execute({
    commandId: "cycle-selected-types",
    type: "nodes.update-type",
    label: "Cycle selected entity Types",
    expectedRevision: 0,
    payload: { treeId: fixtureTree.id, nodeIds: typeCycleNodeIds, value: "assumption" }
  });
  assert(
    synchronizedTypes.workspace.trees[0].nodes
      .filter((node) => typeCycleNodeIds.includes(node.id))
      .every((node) => node.type === "assumption"),
    "a multi-entity Type change must update every selected node atomically"
  );
  const synchronizedTypesUndone = await typeCycleEngine.undo();
  assert(
    synchronizedTypesUndone.workspace.trees[0].nodes
      .filter((node) => typeCycleNodeIds.includes(node.id))
      .every((node) => node.type === "necessaryCondition"),
    "one Undo must restore the complete multi-entity Type change"
  );
  await assert.rejects(
    typeCycleEngine.execute({
      commandId: "invalid-duplicate-goals",
      type: "nodes.update-type",
      label: "Invalid unique Type",
      expectedRevision: 2,
      payload: { treeId: fixtureTree.id, nodeIds: typeCycleNodeIds, value: "goal" }
    }),
    (error) => error.code === "NODE_TYPE_UNIQUE"
  );

  const persisted = [];
  const engine = new TransactionEngine(fixture, {
    clock: () => "2026-07-15T12:00:00.000Z",
    persist: async (workspace, metadata) => persisted.push({ workspace, metadata })
  });

  const applied = await engine.execute(command());
  assert.equal(applied.revision, 1);
  assert.equal(applied.workspace.trees[0].nodes[0].statement, "Updated transactionally");
  assert.equal(applied.history.canUndo, true);
  assert.equal(persisted.length, 1);

  const duplicate = await engine.execute(command());
  assert.equal(duplicate.revision, 1);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.changed, false);
  assert.equal(persisted.length, 1, "idempotent retry must not persist twice");

  const undone = await engine.undo();
  assert.equal(undone.revision, 2);
  assert.equal(undone.workspace.trees[0].nodes[0].statement, originalNode.statement);
  assert.equal(undone.history.canRedo, true);
  assert.equal(undone.category, "content.edit");
  assert.equal(undone.history.redoCategory, "content.edit");

  const redone = await engine.redo();
  assert.equal(redone.revision, 3);
  assert.equal(redone.workspace.trees[0].nodes[0].statement, "Updated transactionally");

  await assert.rejects(
    engine.execute(command({ commandId: "stale", expectedRevision: 1 })),
    (error) => error.code === "REVISION_CONFLICT"
  );
  assert.equal(engine.getSnapshot().revision, 3);

  await assert.rejects(
    engine.execute(command({
      commandId: "invalid",
      expectedRevision: 3,
      payload: { ...command().payload, value: "" }
    })),
    (error) => error.code === "WORKSPACE_INVALID"
  );
  assert.equal(engine.getSnapshot().revision, 3, "invalid transaction must roll back completely");

  const preview = await engine.execute(command({
    commandId: "preview",
    expectedRevision: 3,
    payload: { ...command().payload, value: "Preview only" }
  }), { dryRun: true });
  assert.equal(preview.dryRun, true);
  assert.equal(preview.workspace.revision, 4);
  assert.equal(engine.getSnapshot().revision, 3, "dry-run must not mutate state");

  const viewWorkspace = engine.getSnapshot();
  viewWorkspace.canvases[0].viewState.zoom = 1.75;
  await engine.execute({
    commandId: "view-change",
    type: "workspace.replace",
    label: "Update view",
    expectedRevision: 3,
    payload: { workspace: viewWorkspace, includeViewState: true }
  }, { recordHistory: false });
  const undoAfterViewChange = await engine.undo();
  assert.equal(undoAfterViewChange.workspace.canvases[0].viewState.zoom, 1.75, "undo must preserve current canvas view state");

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ltp-core-test-"));
  try {
    const workspacePath = path.join(temporaryDirectory, "workspace.json");
    const repository = new WorkspaceRepository(workspacePath);
    await repository.initialize({ ...fixture, revision: 0 });
    const first = new TransactionEngine(await repository.read(), {
      persist: (workspace, metadata) => repository.commit(workspace, metadata)
    });
    const second = new TransactionEngine(await repository.read(), {
      persist: (workspace, metadata) => repository.commit(workspace, metadata)
    });
    await first.execute(command({ commandId: "writer-one" }));
    await assert.rejects(
      second.execute(command({ commandId: "writer-two" })),
      (error) => error.code === "REVISION_CONFLICT"
    );
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }

  console.log("Core tests passed: canvas migration, selection, atomic Type cycling, patches, undo/redo, validation, idempotency, dry-run and concurrency.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
