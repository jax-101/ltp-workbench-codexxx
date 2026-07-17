const assert = require("node:assert/strict");
const { WorkspaceManager } = require("../../src/core/workspace-manager");
const { expectCode, loadFixture } = require("./helpers");

class MemoryRepository {
  async initialize(workspace) {
    this.workspace = structuredClone(workspace);
    return structuredClone(this.workspace);
  }

  async reset(workspace) {
    this.workspace = structuredClone(workspace);
    return structuredClone(this.workspace);
  }

  async commit(workspace) {
    this.workspace = structuredClone(workspace);
    return structuredClone(this.workspace);
  }
}

const run = async () => {
  const manager = new WorkspaceManager({ repositoryFactory: () => new MemoryRepository() });
  const firstOpen = manager.open({ locator: "/virtual/one.json", initialWorkspace: loadFixture() });
  const duplicateOpen = manager.open({ locator: "/virtual/one.json", initialWorkspace: loadFixture() });
  const [first, duplicate] = await Promise.all([firstOpen, duplicateOpen]);
  assert.equal(first, duplicate, "Concurrent open was not deduplicated");
  const second = await manager.open({ locator: "/virtual/two.json", initialWorkspace: loadFixture() });
  assert.notEqual(first, second);
  assert.equal(manager.list().length, 2);
  assert.equal(manager.get("/virtual/one.json"), first);
  assert.equal(manager.close("/virtual/one.json"), true);
  assert.equal(manager.list().length, 1);
  await expectCode(() => manager.open({ locator: "", initialWorkspace: loadFixture() }), "WORKSPACE_LOCATOR_REQUIRED");
};

run().then(() => {
  console.log("Workspace acceptance passed: canonical sessions, concurrent deduplication, isolation and close.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
