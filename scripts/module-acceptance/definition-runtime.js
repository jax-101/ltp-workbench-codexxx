const assert = require("node:assert/strict");
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

console.log("Definition Runtime transitional acceptance passed: immutable Goal Tree, CRT and EC capability lookup.");
