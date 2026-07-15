const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { TransactionEngine } = require("../src/core/transaction-engine");
const { WorkspaceRepository } = require("../src/core/workspace-repository");

const fixturePath = path.join(__dirname, "..", "outputs", "sample-workspace-v0.1.json");
const fixture = JSON.parse(require("node:fs").readFileSync(fixturePath, "utf8"));
const originalNode = fixture.trees[0].nodes[0];

const command = (overrides = {}) => ({
  commandId: "command-update-node",
  type: "node.update",
  label: "Edit goal",
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
  viewWorkspace.trees[0].viewState.zoom = 1.75;
  await engine.execute({
    commandId: "view-change",
    type: "workspace.replace",
    label: "Update view",
    expectedRevision: 3,
    payload: { workspace: viewWorkspace, includeViewState: true }
  }, { recordHistory: false });
  const undoAfterViewChange = await engine.undo();
  assert.equal(undoAfterViewChange.workspace.trees[0].viewState.zoom, 1.75, "undo must preserve current view state");

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

  console.log("Core transaction tests passed: patches, undo/redo, validation, idempotency, dry-run and concurrency.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
