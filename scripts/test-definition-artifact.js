const assert = require("node:assert/strict");
const fixture = require("../definition-contract/v1/fixtures/minimal-valid.json");
const expectedHashes = require("../definition-contract/v1/fixtures/expected-hashes.json");
const {
  DefinitionRuntimeError,
  CANONICALIZATION,
  canonicalSerialize,
  hashDefinition,
  verifyDefinitionHash,
  validateDefinition,
  createDefinitionArtifact
} = require("../src/core/definition-runtime");

const reverseKeys = (value) => {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)]));
};
const invalid = (mutate) => {
  const candidate = structuredClone(fixture);
  mutate(candidate);
  return validateDefinition(candidate);
};

assert.deepEqual(validateDefinition(fixture), { valid: true, diagnostics: [] });
const artifact = createDefinitionArtifact(fixture);
const expectedHash = expectedHashes[`${fixture.id}@${fixture.version}`];
assert.equal(artifact.hash, expectedHash);
assert.equal(artifact.canonicalization, "RFC8785");
assert.equal(hashDefinition(reverseKeys(fixture)), expectedHash, "object key order must not affect identity");
assert.equal(canonicalSerialize(reverseKeys(fixture)), artifact.canonicalJson);
assert(verifyDefinitionHash(fixture, expectedHash));
assert(!verifyDefinitionHash({ ...fixture, label: "Changed" }, expectedHash));
assert(Object.isFrozen(artifact) && Object.isFrozen(artifact.definition.elementTypes[0]));

const source = structuredClone(fixture);
const isolated = createDefinitionArtifact(source);
source.label = "Mutated after creation";
assert.notEqual(source.label, isolated.definition.label, "artifact must not retain mutable input references");

assert(invalid((item) => { item.formatVersion = "2"; }).diagnostics.some((item) => item.code === "SCHEMA_CONST"));
assert(invalid((item) => { item.defaultElementType = "MISSING"; }).diagnostics.some((item) => item.code === "DEFAULT_ELEMENT_TYPE_UNKNOWN"));
assert(invalid((item) => { item.elementTypes.push(structuredClone(item.elementTypes[0])); }).diagnostics.some((item) => item.code === "ELEMENT_TYPE_ID_DUPLICATE"));
assert(invalid((item) => { item.layoutProfile.defaultDirection = "LR"; }).diagnostics.some((item) => item.code === "DEFAULT_DIRECTION_NOT_ALLOWED"));
assert(invalid((item) => { item.validatorSource = "return true"; }).diagnostics.some((item) => item.code === "SCHEMA_ADDITIONALPROPERTIES"));
assert(invalid((item) => { item.presentation.relationStyles = []; }).diagnostics.some((item) => item.code === "RELATION_STYLE_MISSING"));
assert(invalid((item) => { item.relationTypes[0].assumptionPolicy.minimum = 2; }).diagnostics.some((item) => item.code === "ASSUMPTION_RECOMMENDATION_INVALID"));

const executable = structuredClone(fixture);
executable.validationRules.push({ id: "bad", severity: "ERROR", capability: "bad", parameters: { run: () => true } });
assert.equal(validateDefinition(executable).diagnostics[0].code, "DEFINITION_VALUE_NOT_JSON");
const cyclic = structuredClone(fixture);
cyclic.metadata = cyclic;
assert.equal(validateDefinition(cyclic).diagnostics[0].code, "DEFINITION_VALUE_NOT_JSON");
const sparse = structuredClone(fixture);
sparse.elementTypes.length = 2;
assert.equal(validateDefinition(sparse).diagnostics[0].code, "DEFINITION_VALUE_NOT_JSON");
assert.equal(canonicalSerialize({ zero: -0, nested: { b: 2, a: 1 } }), '{"nested":{"a":1,"b":2},"zero":0}');
assert.equal(
  canonicalSerialize({ numbers: [333333333.33333329, 1E30, 4.50, 2e-3, 1e-27] }),
  '{"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27]}'
);
assert.equal(CANONICALIZATION, "RFC8785");
assert.throws(() => canonicalSerialize({ bad: "\ud800" }), /invalid Unicode/);
assert.throws(() => canonicalSerialize({ "\udc00": "bad key" }), /invalid Unicode/);
const accessor = {};
Object.defineProperty(accessor, "run", { enumerable: true, get: () => { throw new Error("must not run"); } });
assert.throws(() => canonicalSerialize(accessor), (error) => error.code === "DEFINITION_VALUE_NOT_JSON");
const decoratedArray = [1];
Object.defineProperty(decoratedArray, "hidden", { value: true });
assert.throws(() => canonicalSerialize(decoratedArray), (error) => error.code === "DEFINITION_VALUE_NOT_JSON");
const disguisedSparseArray = [];
disguisedSparseArray.length = 1;
disguisedSparseArray.extra = true;
assert.throws(() => canonicalSerialize(disguisedSparseArray), (error) => error.code === "DEFINITION_VALUE_NOT_JSON");

assert.throws(
  () => createDefinitionArtifact({ ...fixture, formatVersion: "2" }),
  (error) => error instanceof DefinitionRuntimeError && error.code === "DEFINITION_INVALID" && error.details.diagnostics.length > 0
);

console.log("Definition artifact v1 passed: executable schema, canonical JSON, golden SHA-256, immutability and hostile values.");
