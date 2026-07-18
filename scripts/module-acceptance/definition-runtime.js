const assert = require("node:assert/strict");
const fixture = require("../../definition-contract/v1/fixtures/minimal-valid.json");
const expectedHashes = require("../../definition-contract/v1/fixtures/expected-hashes.json");
const {
  validateDefinition,
  createDefinitionArtifact,
  verifyDefinitionHash
} = require("../../src/core/definition-runtime");
const {
  DIAGRAM_DEFINITIONS,
  getDiagramDefinition,
  getNodeTypeDefinition
} = require("../../src/core/diagram-registry");

assert.deepEqual(Object.keys(DIAGRAM_DEFINITIONS).sort(), ["crt", "ec", "goalTree"]);
for (const [id, definition] of Object.entries(DIAGRAM_DEFINITIONS)) {
  assert.equal(getDiagramDefinition(id), definition);
  assert(Object.isFrozen(definition));
  assert(definition.directions.includes(definition.defaultDirection));
  assert(definition.routingStyles.some((style) => style.id === definition.defaultRoutingStyle));
  assert.equal(new Set(definition.nodeTypes.map((type) => type.id)).size, definition.nodeTypes.length);
}
assert.equal(getDiagramDefinition("missing"), null);
assert.equal(getNodeTypeDefinition("goalTree", "criticalSuccessFactor").shortLabel, "CSF");
assert.equal(getNodeTypeDefinition("goalTree", "missing"), null);

assert.equal(validateDefinition(fixture).valid, true);
const first = createDefinitionArtifact(fixture);
const reordered = Object.fromEntries(Object.entries(fixture).reverse());
const second = createDefinitionArtifact(reordered);
assert.equal(first.hash, expectedHashes[`${fixture.id}@${fixture.version}`]);
assert.equal(first.hash, second.hash);
assert.equal(first.canonicalJson, second.canonicalJson);
assert(verifyDefinitionHash(first.definition, first.hash));
assert(Object.isFrozen(first.definition));

const invalid = structuredClone(fixture);
invalid.defaultElementType = "UNKNOWN";
const rejection = validateDefinition(invalid);
assert.equal(rejection.valid, false);
assert(rejection.diagnostics.some((item) => item.code === "DEFAULT_ELEMENT_TYPE_UNKNOWN"));

console.log("Definition Runtime acceptance passed: legacy lookup plus v1 schema, canonical identity and stable rejection.");
