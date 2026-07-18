const assert = require("node:assert/strict");
const { createView, duplicateView, listDocuments, resolveDocument } = require("../../src/core/document-view");
const { selectionClosure } = require("../../src/core/selection-model");
const { capture } = require("../../src/renderer/subgraph-clipboard");
const { expectCode, loadMigratedFixture } = require("./helpers");

const run = async () => {
  const workspace = loadMigratedFixture();
  const documents = listDocuments(workspace);
  assert.equal(documents.length, workspace.trees.length);
  const document = resolveDocument(workspace, documents[0].id);
  const first = createView(workspace, { id: "view-a", documentId: document.id, zoom: 0.8 });
  const second = duplicateView(workspace, first, { id: "view-b", zoom: 1.2, pan: { x: 10, y: 20 } });
  assert.equal(first.zoom, 0.8);
  assert.equal(second.zoom, 1.2);
  assert.notEqual(first.pan, second.pan);
  assert.deepEqual(first.pan, workspace.canvases[0].viewState.pan);

  const canvas = workspace.canvases.find((item) => item.id === document.canvasId);
  const closure = new Set(selectionClosure(document, [document.hostFrameId], canvas.frames));
  assert(document.nodes.every((node) => closure.has(node.id)));
  assert(document.links.every((link) => closure.has(link.id)));
  const clipboard = capture(document, closure);
  assert.equal(clipboard.elements.length, document.semanticKernel.elements.length);
  assert.equal(clipboard.relations.length, document.semanticKernel.relations.length);
  assert(Object.isFrozen(clipboard), "clipboard snapshots are immutable view read models");
  await expectCode(() => Promise.resolve(resolveDocument(workspace, "missing")), "DOCUMENT_NOT_FOUND");
};

run().then(() => {
  console.log("View acceptance passed: documents, independent views, deterministic selection, closed clipboard and stable errors.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
