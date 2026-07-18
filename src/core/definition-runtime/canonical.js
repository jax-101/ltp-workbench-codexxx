const { createHash, timingSafeEqual } = require("node:crypto");
const { DefinitionRuntimeError } = require("./errors");

function assertUnicode(value, path) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) index += 1;
      else throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} contains invalid Unicode`, { path });
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} contains invalid Unicode`, { path });
    }
  }
}

function canonicalize(value, path = "$", ancestors = new Set()) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    assertUnicode(value, path);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} is not a finite JSON number`, { path });
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") {
    throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} is not a JSON value`, { path });
  }
  if (ancestors.has(value)) {
    throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} contains a cycle`, { path });
  }
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) {
      throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} is not a dense JSON array`, { path });
    }
    result = value.map((item, index) => canonicalize(item, `${path}[${index}]`, ancestors));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} is not a plain JSON object`, { path });
    }
    if (Reflect.ownKeys(value).length !== Object.keys(value).length) {
      throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${path} has non-JSON properties`, { path });
    }
    Object.keys(value).forEach((key) => assertUnicode(key, `${path} property name`));
    // RFC 8785 sorts raw property names by unsigned UTF-16 code units.
    result = Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key], `${path}.${key}`, ancestors)])
    );
  }
  ancestors.delete(value);
  return result;
}

const canonicalSerialize = (value) => JSON.stringify(canonicalize(value));
const hashCanonical = (canonicalJson) => `sha256:${createHash("sha256").update(canonicalJson, "utf8").digest("hex")}`;
const hashDefinition = (definition) => hashCanonical(canonicalSerialize(definition));

function verifyDefinitionHash(definition, expectedHash) {
  const actual = Buffer.from(hashDefinition(definition));
  const expected = Buffer.from(String(expectedHash));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

module.exports = { canonicalize, canonicalSerialize, hashCanonical, hashDefinition, verifyDefinitionHash };
