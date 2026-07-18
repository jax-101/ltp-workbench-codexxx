const { canonicalSerialize } = require("./canonical");
const { createDefinitionArtifact } = require("./artifact");
const { DefinitionRuntimeError } = require("./errors");
const { ENTRY_PATH, readConfinedJson, resolvePackageRoot, validateRelativePath } = require("./package-reader");
const { ResourceBudget, measureJson, normalizeResourceLimits } = require("./resource-limits");

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function embeddedFixture(source, fixturePath) {
  if (!source.fixtures || !Object.prototype.hasOwnProperty.call(source.fixtures, fixturePath)) {
    throw new DefinitionRuntimeError("DEFINITION_PACKAGE_MISSING", "Embedded definition fixture is missing", {
      relativePath: fixturePath
    });
  }
  return source.fixtures[fixturePath];
}

function normalizeJson(value, resource, byteLimit, budget, limits, consumeBytes = true) {
  measureJson(value, limits, resource);
  const canonicalJson = canonicalSerialize(value);
  if (consumeBytes) budget.consume(Buffer.byteLength(canonicalJson, "utf8"), resource, byteLimit);
  return JSON.parse(canonicalJson);
}

async function materializeDefinitionUnsafe(source, options = {}) {
  if (!source || typeof source !== "object" || !["directory", "embedded"].includes(source.kind)) {
    throw new DefinitionRuntimeError("DEFINITION_SOURCE_INVALID", "Definition source must be directory or embedded");
  }
  const limits = normalizeResourceLimits(options.limits);
  const budget = new ResourceBudget(limits);
  let definition;
  let realRoot = null;

  if (source.kind === "directory") {
    realRoot = await resolvePackageRoot(source.rootPath);
    definition = await readConfinedJson(realRoot, ENTRY_PATH, budget, limits.definitionBytes, "definitionBytes");
    measureJson(definition, limits, "definition");
  } else {
    definition = normalizeJson(source.definition, "definitionBytes", limits.definitionBytes, budget, limits);
  }

  const artifact = createDefinitionArtifact(definition);
  const fixtures = {};
  for (const fixture of artifact.definition.fixtures) {
    validateRelativePath(fixture.path);
    const value = source.kind === "directory"
      ? await readConfinedJson(realRoot, fixture.path, budget, limits.fixtureBytes, "fixtureBytes")
      : embeddedFixture(source, fixture.path);
    fixtures[fixture.path] = normalizeJson(
      value,
      "fixtureBytes",
      limits.fixtureBytes,
      budget,
      limits,
      source.kind === "embedded"
    );
  }

  return deepFreeze({ artifact, fixtures, resourceUsage: { totalBytes: budget.totalBytes } });
}

async function materializeDefinition(source, options = {}) {
  try {
    return await materializeDefinitionUnsafe(source, options);
  } catch (error) {
    if (error instanceof DefinitionRuntimeError) throw error;
    throw new DefinitionRuntimeError("DEFINITION_SOURCE_INVALID", "Definition source could not be materialized safely");
  }
}

function unsupportedCapabilities(definitionPackage, supportedCapabilities) {
  const supported = new Set(Array.isArray(supportedCapabilities) ? supportedCapabilities : []);
  return definitionPackage.artifact.definition.requiredKernelCapabilities.filter((item) => !supported.has(item));
}

async function loadDefinition(source, options = {}) {
  const definitionPackage = await materializeDefinition(source, options);
  const unsupported = unsupportedCapabilities(definitionPackage, options.supportedCapabilities);
  if (unsupported.length) {
    throw new DefinitionRuntimeError(
      "DEFINITION_CAPABILITY_UNSUPPORTED",
      "Definition requires unsupported kernel capabilities",
      { capabilities: unsupported }
    );
  }
  return definitionPackage;
}

module.exports = { loadDefinition, materializeDefinition, unsupportedCapabilities };
