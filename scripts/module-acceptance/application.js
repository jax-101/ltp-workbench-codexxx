const assert = require("node:assert/strict");
const { TransactionEngine } = require("../../src/core/transaction-engine");
const { expectCode, loadMigratedFixture } = require("./helpers");

const run = async () => {
  const workspace = loadMigratedFixture();
  const tree = workspace.trees[0];
  const node = tree.nodes[0];
  const engine = new TransactionEngine(workspace, { clock: () => "2026-07-18T00:00:00.000Z" });
  const command = {
    commandId: "acceptance-node-update",
    type: "node.update",
    label: "Acceptance edit",
    expectedRevision: 0,
    payload: { treeId: tree.id, nodeId: node.id, field: "statement", value: "Acceptance value" }
  };

  const result = await engine.execute(command);
  assert.equal(result.changed, true);
  assert.equal(result.revision, 1);
  assert.equal(engine.getSnapshot().trees[0].nodes[0].statement, "Acceptance value");
  const duplicate = await engine.execute(command);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.changed, false);
  await expectCode(() => engine.execute({ ...command, commandId: "conflict" }), "REVISION_CONFLICT");
  assert.equal((await engine.undo()).revision, 2);
  assert.equal(engine.getSnapshot().trees[0].nodes[0].statement, node.statement);
  assert.equal((await engine.redo()).revision, 3);
};

run().then(() => {
  console.log("Application acceptance passed: atomic command, idempotency, revision conflict and Undo/Redo.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
