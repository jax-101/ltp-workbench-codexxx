const { canonicalSerialize, hashCanonical } = require("./canonical");
const { DefinitionRuntimeError } = require("./errors");
const { definitionSchema, validateDefinition } = require("./validation");

const CONTRACT_VERSION = 1;
const SCHEMA_ID = definitionSchema.$id;
const CANONICALIZATION = "RFC8785";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function createDefinitionArtifact(candidate) {
  const validation = validateDefinition(candidate);
  if (!validation.valid) {
    throw new DefinitionRuntimeError("DEFINITION_INVALID", "Definition does not satisfy contract v1", {
      diagnostics: validation.diagnostics
    });
  }
  const canonicalJson = canonicalSerialize(candidate);
  return deepFreeze({
    contractVersion: CONTRACT_VERSION,
    canonicalization: CANONICALIZATION,
    schemaId: SCHEMA_ID,
    definition: JSON.parse(canonicalJson),
    canonicalJson,
    hash: hashCanonical(canonicalJson)
  });
}

module.exports = { CANONICALIZATION, CONTRACT_VERSION, SCHEMA_ID, createDefinitionArtifact };
