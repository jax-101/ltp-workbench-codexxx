const assert = require("node:assert/strict");
const {
  addSemanticKernel,
  removeSemanticKernel,
  semanticFingerprint
} = require("../../src/core/semantic-migration");
const { validateSemanticGraph } = require("../../src/core/semantic-validator");
const { loadFixture } = require("./helpers");

const source = loadFixture();
const activated = addSemanticKernel(source);
assert.equal(activated.changed, true);
assert.equal(source.trees[0].semanticKernel, undefined, "Semantic activation mutated its input");

for (const tree of activated.workspace.trees) {
  assert(tree.semanticKernel, `Missing semantic graph for ${tree.id}`);
  assert.deepEqual(validateSemanticGraph(tree.semanticKernel), []);
  assert.equal(tree.semanticKernel.sourceFingerprint, semanticFingerprint(tree));
}

const repeated = addSemanticKernel(activated.workspace);
assert.equal(repeated.changed, false, "Semantic activation is not idempotent");
const downgraded = removeSemanticKernel(activated.workspace);
assert.equal(downgraded.changed, true);
assert.deepEqual(downgraded.workspace, source, "Semantic downgrade is not exact");

const invalid = structuredClone(activated.workspace.trees[0].semanticKernel);
invalid.elements.push(structuredClone(invalid.elements[0]));
assert(validateSemanticGraph(invalid).some((issue) => issue.severity === "ERROR"));

console.log("Semantic Kernel acceptance passed: deterministic activation, validation, idempotency and exact downgrade.");
