const { DefinitionRuntimeError } = require("./errors");
const { createDefinitionArtifact } = require("./artifact");
const { materializeDefinition, unsupportedCapabilities } = require("./loader");
const { normalizeResourceLimits } = require("./resource-limits");

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function createDefinitionPin(definitionPackage) {
  const artifact = definitionPackage?.artifact || definitionPackage;
  const definition = artifact?.definition;
  let verified;
  try {
    verified = definition ? createDefinitionArtifact(definition) : null;
  } catch (error) {
    verified = null;
  }
  if (!verified || !HASH_PATTERN.test(artifact.hash || "") || verified.hash !== artifact.hash) {
    throw new DefinitionRuntimeError("DEFINITION_PIN_INVALID", "A loaded definition artifact is required to create a pin");
  }
  return deepFreeze({
    formatVersion: definition.formatVersion,
    id: definition.id,
    version: definition.version,
    hash: artifact.hash
  });
}

function validatePin(pin) {
  const keys = pin && typeof pin === "object" && !Array.isArray(pin) ? Object.keys(pin).sort() : [];
  if (
    keys.join(",") !== "formatVersion,hash,id,version" || pin.formatVersion !== "1" ||
    !ID_PATTERN.test(pin.id || "") || !VERSION_PATTERN.test(pin.version || "") || !HASH_PATTERN.test(pin.hash || "")
  ) {
    throw new DefinitionRuntimeError("DEFINITION_PIN_INVALID", "Definition pin is malformed");
  }
  return deepFreeze({ ...pin });
}

function diagnostic(error, sourceIndex) {
  return deepFreeze({
    code: error.code || "DEFINITION_LOAD_FAILED",
    message: error instanceof DefinitionRuntimeError ? error.message : "Definition source could not be loaded",
    details: { ...(error instanceof DefinitionRuntimeError ? error.details : {}), sourceIndex }
  });
}

function outcome(status, pin, definitionPackage, diagnostics) {
  return deepFreeze({
    status,
    access: status === "ready" ? "read-write" : "read-only",
    pin,
    package: definitionPackage,
    diagnostics
  });
}

async function resolvePinnedDefinition(request = {}, options = {}) {
  const pin = validatePin(request.pin);
  const limits = normalizeResourceLimits(options.limits);
  if (request.sources !== undefined && !Array.isArray(request.sources)) {
    throw new DefinitionRuntimeError("DEFINITION_SOURCE_INVALID", "Pinned definition sources must be an array");
  }
  const snapshotSource = request.snapshot ? [{
    kind: "embedded",
    definition: request.snapshot.definition,
    fixtures: request.snapshot.fixtures
  }] : [];
  const sources = [...snapshotSource, ...(request.sources || [])];
  if (sources.length > limits.sources) {
    throw new DefinitionRuntimeError("DEFINITION_RESOURCE_LIMIT", "Definition source count exceeds its limit", {
      resource: "sources", limit: limits.sources, actual: sources.length
    });
  }

  const diagnostics = [];
  let hashConflict = false;
  let unsupportedMatch = null;
  for (const [sourceIndex, source] of sources.entries()) {
    let definitionPackage;
    try {
      definitionPackage = await materializeDefinition(source, options);
    } catch (error) {
      diagnostics.push(diagnostic(error, sourceIndex));
      continue;
    }
    const definition = definitionPackage.artifact.definition;
    if (definition.id !== pin.id || definition.version !== pin.version || definition.formatVersion !== pin.formatVersion) continue;
    if (definitionPackage.artifact.hash !== pin.hash) {
      hashConflict = true;
      diagnostics.push(diagnostic(new DefinitionRuntimeError(
        "DEFINITION_HASH_MISMATCH", "Published definition content does not match its pin"
      ), sourceIndex));
      continue;
    }
    const unsupported = unsupportedCapabilities(definitionPackage, options.supportedCapabilities);
    if (!unsupported.length) return outcome("ready", pin, definitionPackage, diagnostics);
    unsupportedMatch ||= definitionPackage;
    diagnostics.push(diagnostic(new DefinitionRuntimeError(
      "DEFINITION_CAPABILITY_UNSUPPORTED", "Pinned definition requires unsupported kernel capabilities", { capabilities: unsupported }
    ), sourceIndex));
  }

  if (unsupportedMatch) return outcome("rescue", pin, unsupportedMatch, diagnostics);
  const fallbackCode = hashConflict ? "DEFINITION_HASH_MISMATCH" : "DEFINITION_VERSION_MISSING";
  if (!diagnostics.some((item) => item.code === fallbackCode)) {
    diagnostics.push(diagnostic(new DefinitionRuntimeError(
      fallbackCode,
      hashConflict ? "Pinned definition hash is unavailable" : "Pinned definition version is unavailable"
    ), -1));
  }
  return outcome("rescue", pin, null, diagnostics);
}

module.exports = { createDefinitionPin, resolvePinnedDefinition, validatePin };
