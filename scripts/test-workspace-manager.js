const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { WorkspaceManager } = require("../src/core/workspace-manager");
const { createView, duplicateView, initialDocumentId, listDocuments, resolveDocument } = require("../src/core/document-view");

const fixture = require("../outputs/sample-workspace-v0.1.json");

const run = async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ltp-workspace-manager-"));
  try {
    const manager = new WorkspaceManager();
    const projectAPath = path.join(directory, "project-a", "workspace.json");
    const projectBPath = path.join(directory, "project-b", "workspace.json");
    const projectA = structuredClone(fixture);
    const projectB = structuredClone(fixture);
    projectA.workspace.id = "workspace-project-a";
    projectA.workspace.name = "Project A";
    projectB.workspace.id = "workspace-project-b";
    projectB.workspace.name = "Project B";

    let projectALoads = 0;
    const loadProjectA = async () => {
      projectALoads += 1;
      return structuredClone(projectA);
    };
    const [sessionA, repeatedSessionA] = await Promise.all([
      manager.open({ filePath: projectAPath, loadInitialWorkspace: loadProjectA }),
      manager.open({ filePath: projectAPath, loadInitialWorkspace: loadProjectA })
    ]);
    const sessionB = await manager.open({ filePath: projectBPath, initialWorkspace: projectB });
    assert.strictEqual(sessionA, repeatedSessionA, "concurrent opens of one project must share one session");
    assert.equal(projectALoads, 1, "one project must be loaded only once while its session is opening");
    assert.notStrictEqual(sessionA, sessionB);
    assert.equal(manager.list().length, 2);
    assert.equal(sessionA.id, "workspace-project-a");
    assert.equal(sessionB.id, "workspace-project-b");

    const treeA = sessionA.getSnapshot().trees.find(() => true);
    const nodeA = treeA.nodes.find(() => true);
    const originalProjectBStatement = sessionB.getSnapshot().trees.find(() => true).nodes.find(() => true).statement;
    await sessionA.engine.execute({
      commandId: "edit-project-a",
      type: "node.update",
      label: "Edit only Project A",
      expectedRevision: 0,
      payload: { treeId: treeA.id, nodeId: nodeA.id, field: "statement", value: "Project A changed independently" }
    });
    assert.equal(sessionA.getSnapshot().revision, 1);
    assert.equal(sessionB.getSnapshot().revision || 0, 0);
    assert.equal(sessionB.getSnapshot().trees.find(() => true).nodes.find(() => true).statement, originalProjectBStatement);

    const documentWorkspace = sessionA.getSnapshot();
    const firstDocumentId = initialDocumentId(documentWorkspace);
    assert.equal(resolveDocument(documentWorkspace, firstDocumentId).id, firstDocumentId);
    const primaryView = createView(documentWorkspace, { id: "view-primary", documentId: firstDocumentId, zoom: 1.25 });
    const secondaryView = duplicateView(documentWorkspace, primaryView, {
      id: "view-secondary",
      zoom: 0.75,
      focusFrameId: treeA.hostFrameId
    });
    assert.equal(primaryView.documentId, secondaryView.documentId);
    assert.notEqual(primaryView.id, secondaryView.id);
    assert.equal(primaryView.zoom, 1.25);
    assert.equal(secondaryView.zoom, 0.75);
    assert.equal(primaryView.focusFrameId, null);
    assert.equal(secondaryView.focusFrameId, treeA.hostFrameId);

    const secondDocument = {
      ...structuredClone(resolveDocument(documentWorkspace, firstDocumentId)),
      id: "tree-second-document",
      name: "Second document"
    };
    const multiDocumentWorkspace = structuredClone(documentWorkspace);
    multiDocumentWorkspace.trees.push(secondDocument);
    assert.deepEqual(listDocuments(multiDocumentWorkspace).map((document) => document.id), [firstDocumentId, secondDocument.id]);
    assert.equal(initialDocumentId(multiDocumentWorkspace, secondDocument.id), secondDocument.id);

    assert.equal(manager.close(projectBPath), true);
    assert.equal(manager.list().length, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }

  console.log("Workspace manager passed: two isolated projects, concurrent-open deduplication, explicit documents and independent views.");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
