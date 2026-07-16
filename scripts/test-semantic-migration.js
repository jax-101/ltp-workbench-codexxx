const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  addSemanticKernel,
  projectTreeToSemantic,
  removeSemanticKernel,
  semanticFingerprint
} = require("../src/core/semantic-migration");
const { validateWorkspace } = require("../src/core/workspace-validator");
const { TransactionEngine } = require("../src/core/transaction-engine");

const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "outputs", name), "utf8"));
const fixtures = [load("sample-workspace-v0.1.json"), load("complex-goal-tree-workspace-v0.1.json")];

const run = async () => {
  for (const fixture of fixtures) {
    const source = structuredClone(fixture);
    const migrated = addSemanticKernel(fixture);
    const tree = migrated.workspace.trees[0];
    const sourceTree = source.trees[0];

    assert.equal(migrated.changed, true);
    assert.deepEqual(migrated.migratedTreeIds, [sourceTree.id]);
    assert.deepEqual(fixture, source, "migration must not mutate its input");
    assert.equal(migrated.workspace.schemaVersion, source.schemaVersion, "additive preview must not claim a new public schema");
    assert.equal(tree.schemaVersion, sourceTree.schemaVersion);
    assert.equal(tree.semanticKernel.profile, "GOAL_TREE");
    assert.equal(tree.semanticKernel.logicMode, "NECESSITY");
    assert.equal(tree.semanticKernel.elements.length, sourceTree.nodes.length);
    assert.equal(tree.semanticKernel.relations.length, sourceTree.links.length);
    assert.equal(tree.semanticKernel.assumptions.length, sourceTree.assumptions.length);
    assert.equal(tree.semanticKernel.sourceFingerprint, semanticFingerprint(sourceTree));
    assert.deepEqual(tree.nodes, sourceTree.nodes);
    assert.deepEqual(tree.links, sourceTree.links);
    assert.deepEqual(tree.assumptions, sourceTree.assumptions);
    assert.deepEqual(tree.layout, sourceTree.layout);
    assert.deepEqual(migrated.workspace.canvases, source.canvases);
    assert.deepEqual(validateWorkspace(migrated.workspace), []);

    const repeated = addSemanticKernel(migrated.workspace);
    assert.equal(repeated.changed, false, "migration must be idempotent");
    assert.deepEqual(repeated.workspace, migrated.workspace);

    const downgraded = removeSemanticKernel(migrated.workspace);
    assert.equal(downgraded.changed, true);
    assert.deepEqual(downgraded.workspace, source, "downgrade must reproduce the exact source workspace");
    assert.equal(removeSemanticKernel(downgraded.workspace).changed, false);
  }

  const deterministicTree = fixtures[0].trees[0];
  assert.deepEqual(projectTreeToSemantic(deterministicTree), projectTreeToSemantic(deterministicTree));

  const visualOnly = addSemanticKernel(fixtures[0]).workspace;
  visualOnly.trees[0].layout.nodes[visualOnly.trees[0].nodes[0].id].x += 123;
  visualOnly.canvases[0].viewState.zoom = 1.75;
  assert.equal(addSemanticKernel(visualOnly).changed, false, "layout and view changes must not stale semantic data");

  const stale = addSemanticKernel(fixtures[0]).workspace;
  stale.trees[0].nodes[0].statement = "Changed outside the semantic kernel";
  assert(validateWorkspace(stale).some((issue) => issue.code === "SEMANTIC_MIGRATION_STALE"));
  assert.throws(() => addSemanticKernel(stale), (error) => error.code === "SEMANTIC_MIGRATION_STALE");

  const invalidKernel = addSemanticKernel(fixtures[0]).workspace;
  invalidKernel.trees[0].semanticKernel.relations[0].inputs[0].elementId = "missing-element";
  assert(validateWorkspace(invalidKernel).some((issue) => issue.code === "SEMANTIC_ENDPOINT_MISSING"));

  const promoted = structuredClone(fixtures[0]);
  const promotedTree = promoted.trees[0];
  const promotedCanvas = promoted.canvases[0];
  const promotedNode = {
    ...structuredClone(promotedTree.nodes[0]),
    id: "node-promoted-assumption",
    type: "assumption",
    statement: "An assumption shown as a visual annotation",
    promotedFrom: { type: "assumption", id: promotedTree.assumptions[0].id, linkId: promotedTree.assumptions[0].linkId }
  };
  promotedTree.nodes.push(promotedNode);
  promotedTree.layout.nodes[promotedNode.id] = { x: 10, y: 10, width: 260, height: 72, pinned: false, layoutSource: "manual" };
  promotedCanvas.frames.find((frame) => frame.id === promotedNode.frameId).nodeIds.push(promotedNode.id);
  const promotedProjection = projectTreeToSemantic(promotedTree);
  assert.equal(promotedProjection.annotations.length, 1);
  assert.equal(promotedProjection.annotations[0].assumptionId, promotedTree.assumptions[0].id);
  assert.equal(promotedProjection.elements.some((element) => element.id === promotedNode.id), false);

  const linkedAnnotation = structuredClone(promotedTree);
  linkedAnnotation.links.push({
    ...structuredClone(linkedAnnotation.links[0]),
    id: "link-promoted-assumption",
    sourceNodeId: promotedNode.id
  });
  assert.throws(
    () => projectTreeToSemantic(linkedAnnotation),
    (error) => error.code === "SEMANTIC_NODE_TYPE_UNSUPPORTED" && error.details.linked === true
  );

  const unsupportedRelation = structuredClone(fixtures[0].trees[0]);
  unsupportedRelation.links[0].logic = "sufficiency";
  assert.throws(() => projectTreeToSemantic(unsupportedRelation), (error) => error.code === "SEMANTIC_RELATION_UNSUPPORTED");

  const cli = spawnSync(process.execPath, [
    path.join(__dirname, "ltp-cli.js"),
    "semantic",
    "preview",
    "--workspace",
    path.join(__dirname, "..", "outputs", "sample-workspace-v0.1.json"),
    "--json"
  ], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  const cliResult = JSON.parse(cli.stdout);
  assert.equal(cliResult.ok, true);
  assert.equal(cliResult.persisted, false);
  assert.equal(cliResult.trees[0].profile, "GOAL_TREE");
  assert.equal(cliResult.trees[0].relations, fixtures[0].trees[0].links.length);

  const transactionalSource = addSemanticKernel(fixtures[0]).workspace;
  const transactionalTree = transactionalSource.trees[0];
  const editedNode = transactionalTree.nodes[0];
  const originalStatement = editedNode.statement;
  const engine = new TransactionEngine(transactionalSource, { clock: () => "2026-07-16T12:00:00.000Z" });
  const edited = await engine.execute({
    commandId: "semantic-parity-edit",
    type: "node.update",
    label: "Edit with semantic parity",
    expectedRevision: 0,
    payload: { treeId: transactionalTree.id, nodeId: editedNode.id, field: "statement", value: "Updated through one writer" }
  });
  const editedTree = edited.workspace.trees[0];
  assert.equal(editedTree.nodes[0].statement, "Updated through one writer");
  assert.equal(editedTree.semanticKernel.elements.find((element) => element.id === editedNode.id).statement, "Updated through one writer");
  assert.equal(editedTree.semanticKernel.sourceFingerprint, semanticFingerprint(editedTree));
  assert(edited.patches.some((patch) => patch.path.includes("semanticKernel")), "semantic refresh must be part of the transaction");

  const undone = await engine.undo();
  assert.equal(undone.workspace.trees[0].nodes[0].statement, originalStatement);
  assert.equal(undone.workspace.trees[0].semanticKernel.elements.find((element) => element.id === editedNode.id).statement, originalStatement);
  const redone = await engine.redo();
  assert.equal(redone.workspace.trees[0].nodes[0].statement, "Updated through one writer");
  assert.equal(redone.workspace.trees[0].semanticKernel.elements.find((element) => element.id === editedNode.id).statement, "Updated through one writer");

  const viewWorkspace = redone.workspace;
  viewWorkspace.canvases[0].viewState.zoom = 1.33;
  const viewResult = await engine.execute({
    commandId: "semantic-view-only",
    type: "workspace.replace",
    label: "View-only change",
    expectedRevision: 3,
    payload: { workspace: viewWorkspace, includeViewState: true }
  }, { recordHistory: false });
  assert.equal(viewResult.patches.some((patch) => patch.path.includes("semanticKernel")), false, "visual edits must not rewrite semantic data");

  const genericEngine = new TransactionEngine(addSemanticKernel(fixtures[0]).workspace, {
    clock: () => "2026-07-16T13:00:00.000Z"
  });
  const genericTree = genericEngine.getSnapshot().trees[0];
  const genericElement = genericTree.semanticKernel.elements[0];
  const genericRelation = genericTree.semanticKernel.relations[0];
  const genericAssumption = genericTree.semanticKernel.assumptions[0];
  const elementResult = await genericEngine.execute({
    commandId: "generic-element-update",
    type: "semantic.element.update",
    label: "Update semantic element",
    expectedRevision: 0,
    payload: { treeId: genericTree.id, elementId: genericElement.id, field: "statement", value: "Edited through semantic API" }
  });
  assert.equal(elementResult.workspace.trees[0].nodes.find((node) => node.id === genericElement.id).statement, "Edited through semantic API");
  assert.equal(elementResult.workspace.trees[0].semanticKernel.elements.find((element) => element.id === genericElement.id).statement, "Edited through semantic API");
  assert(
    elementResult.workspace.trees[0].links
      .filter((link) => link.sourceNodeId === genericElement.id || link.targetNodeId === genericElement.id)
      .every((link) => link.verbalization.includes("Edited through semantic API")),
    "editing an element must refresh verbalizations of incident relations"
  );

  const alternativeInput = genericTree.semanticKernel.elements.find(
    (element) => element.id !== genericRelation.inputs[0].elementId && element.id !== genericRelation.outputs[0].elementId
  );
  const relationResult = await genericEngine.execute({
    commandId: "generic-relation-update",
    type: "semantic.relation.update-endpoints",
    label: "Retarget semantic relation",
    expectedRevision: 1,
    payload: {
      treeId: genericTree.id,
      relationId: genericRelation.id,
      inputElementId: alternativeInput.id,
      outputElementId: genericRelation.outputs[0].elementId
    }
  });
  const projectedLink = relationResult.workspace.trees[0].links.find((link) => link.id === genericRelation.id);
  assert.equal(projectedLink.sourceNodeId, alternativeInput.id);
  assert(projectedLink.verbalization.includes(alternativeInput.statement));
  assert(projectedLink.meaning.includes(alternativeInput.statement));
  assert.equal(relationResult.workspace.trees[0].semanticKernel.relations.find((relation) => relation.id === genericRelation.id).inputs[0].elementId, alternativeInput.id);

  const assumptionResult = await genericEngine.execute({
    commandId: "generic-assumption-update",
    type: "semantic.assumption.update",
    label: "Update semantic assumption",
    expectedRevision: 2,
    payload: { treeId: genericTree.id, assumptionId: genericAssumption.id, field: "statement", value: "Edited assumption through semantic API" }
  });
  assert.equal(assumptionResult.workspace.trees[0].assumptions.find((item) => item.id === genericAssumption.id).statement, "Edited assumption through semantic API");
  assert.equal(assumptionResult.workspace.trees[0].semanticKernel.assumptions.find((item) => item.id === genericAssumption.id).statement, "Edited assumption through semantic API");
  const assumptionUndone = await genericEngine.undo();
  assert.notEqual(assumptionUndone.workspace.trees[0].assumptions.find((item) => item.id === genericAssumption.id).statement, "Edited assumption through semantic API");
  assert.equal(
    assumptionUndone.workspace.trees[0].assumptions.find((item) => item.id === genericAssumption.id).statement,
    assumptionUndone.workspace.trees[0].semanticKernel.assumptions.find((item) => item.id === genericAssumption.id).statement
  );

  const guardedEngine = new TransactionEngine(addSemanticKernel(fixtures[0]).workspace);
  const guardedTree = guardedEngine.getSnapshot().trees[0];
  const guardedRelation = guardedTree.semanticKernel.relations[0];
  await assert.rejects(
    guardedEngine.execute({
      commandId: "invalid-semantic-self-loop",
      type: "semantic.relation.update-endpoints",
      label: "Invalid semantic self-loop",
      expectedRevision: 0,
      payload: {
        treeId: guardedTree.id,
        relationId: guardedRelation.id,
        inputElementId: guardedRelation.outputs[0].elementId,
        outputElementId: guardedRelation.outputs[0].elementId
      }
    }),
    (error) => error.code === "SEMANTIC_GRAPH_INVALID"
  );
  await assert.rejects(
    guardedEngine.execute({
      commandId: "invalid-empty-element",
      type: "semantic.element.update",
      label: "Invalid empty element",
      expectedRevision: 0,
      payload: { treeId: guardedTree.id, elementId: guardedTree.semanticKernel.elements[0].id, field: "statement", value: "" }
    }),
    (error) => error.code === "SEMANTIC_GRAPH_INVALID"
  );
  assert.equal(guardedEngine.getSnapshot().revision || 0, 0, "invalid semantic commands must roll back completely");

  console.log("Semantic migration passed: 2 Goal Tree workspaces, exact downgrade, shared validation, transactional parity, generic updates and rollback guards.");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
