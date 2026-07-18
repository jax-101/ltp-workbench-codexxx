const assert = require("node:assert/strict");
const { TransactionEngine } = require("../src/core/transaction-engine");
const { capture, createIdMap } = require("../src/renderer/subgraph-clipboard");
const { buildCrtFixture } = require("./build-crt-fixture");
const { migrateWorkspace } = require("../src/core/workspace-migrations");
const sample = require("../outputs/sample-workspace-v0.1.json");

const command = (workspace, tree, clipboard, idMap, suffix = "native") => ({
  commandId: `paste-${suffix}`,
  type: "semantic.subgraph.paste",
  label: "Paste subgraph",
  expectedRevision: workspace.revision || 0,
  payload: {
    treeId: tree.id,
    targetFrameId: tree.hostFrameId,
    clipboard,
    idMap,
    origin: { x: 120, y: 140 }
  }
});

const deterministicIds = (prefix) => {
  let count = 0;
  return (kind) => `${prefix}-${kind}-${++count}`;
};

const runNative = async () => {
  const workspace = buildCrtFixture();
  workspace.revision = 0;
  const tree = workspace.trees[0];
  const selected = ["capacity", "feedback", "rework"];
  const clipboard = capture(tree, selected);
  assert.deepEqual(clipboard.elements.map((item) => item.id).sort(), selected.sort());
  assert.deepEqual(clipboard.relations.map((item) => item.id), ["rel-and-rework"]);
  assert.equal(clipboard.assumptions.length, 2, "assumptions behind the complete relation travel with it");
  assert(Object.isFrozen(clipboard) && Object.isFrozen(clipboard.elements));

  const partial = capture(tree, ["capacity", "rework"]);
  assert.equal(partial.relations.length, 0, "an n-ary relation cannot be copied with a missing endpoint");
  assert.equal(partial.assumptions.length, 0);

  const ids = createIdMap(clipboard, deterministicIds("native-copy"));
  const engine = new TransactionEngine(workspace, { clock: () => "2026-07-18T12:00:00.000Z" });
  const result = await engine.execute(command(workspace, tree, clipboard, ids));
  const pastedTree = result.workspace.trees[0];
  const pastedRelation = pastedTree.semanticKernel.relations.find((item) => item.id === ids.relations["rel-and-rework"]);
  assert.equal(result.revision, 1);
  assert.equal(pastedTree.semanticKernel.elements.length, tree.semanticKernel.elements.length + 3);
  assert.deepEqual(
    pastedRelation.inputs.map((item) => item.elementId).sort(),
    [ids.elements.capacity, ids.elements.feedback].sort()
  );
  assert.deepEqual(pastedRelation.outputs, [{ elementId: ids.elements.rework }]);
  assert.equal(
    pastedTree.semanticKernel.assumptions.filter((item) => item.subject.relationId === pastedRelation.id).length,
    2
  );
  assert(Object.values(ids.elements).every((id) => pastedTree.renderProjection.frameByNodeId[id] === tree.hostFrameId));
  assert(Object.values(ids.elements).every((id) => pastedTree.layout.nodes[id].layoutSource === "paste"));
  assert.equal(result.history.undoLabel, "Paste subgraph");

  const undone = await engine.undo();
  assert.equal(undone.workspace.trees[0].semanticKernel.elements.length, tree.semanticKernel.elements.length);
  assert.equal(undone.workspace.trees[0].semanticKernel.relations.some((item) => item.id === pastedRelation.id), false);
  const redone = await engine.redo();
  assert.equal(redone.workspace.trees[0].semanticKernel.relations.some((item) => item.id === pastedRelation.id), true);

  const malformed = structuredClone(clipboard);
  malformed.relations[0].inputs.push({ elementId: "outside" });
  const before = engine.getSnapshot();
  await assert.rejects(
    () => engine.execute(command(before, before.trees[0], malformed, createIdMap(malformed, deterministicIds("bad")), "bad")),
    (error) => error.code === "SUBGRAPH_RELATION_OPEN"
  );
  assert.deepEqual(engine.getSnapshot(), before, "invalid paste must leave the workspace untouched");
};

const runLegacy = async () => {
  const workspace = migrateWorkspace(structuredClone(sample)).workspace;
  workspace.revision = 0;
  const tree = workspace.trees[0];
  const relation = tree.semanticKernel.relations.find((item) =>
    [...item.inputs, ...item.outputs].every((endpoint) =>
      tree.nodes.find((node) => node.id === endpoint.elementId)?.type !== "goal")
  );
  assert(relation, "fixture needs a copyable relation without the unique Goal");
  const selected = [...relation.inputs, ...relation.outputs].map((item) => item.elementId);
  const clipboard = capture(tree, selected);
  const ids = createIdMap(clipboard, deterministicIds("legacy-copy"));
  const engine = new TransactionEngine(workspace, { clock: () => "2026-07-18T12:00:00.000Z" });
  const result = await engine.execute(command(workspace, tree, clipboard, ids, "legacy"));
  const pasted = result.workspace.trees[0];
  assert(Object.values(ids.elements).every((id) => pasted.nodes.some((node) => node.id === id)));
  assert(Object.values(ids.relations).every((id) => pasted.links.some((link) => link.id === id)));
  assert.equal(pasted.semanticKernel.elements.length, tree.semanticKernel.elements.length + clipboard.elements.length);
  assert.equal((await engine.undo()).workspace.trees[0].nodes.length, tree.nodes.length);
};

Promise.all([runNative(), runLegacy()]).then(() => {
  console.log("Subgraph transfer passed: n-ary closure, assumptions, geometry, legacy parity and atomic Undo/Redo.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
