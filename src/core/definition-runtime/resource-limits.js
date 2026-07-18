const { DefinitionRuntimeError } = require("./errors");

const DEFAULT_RESOURCE_LIMITS = Object.freeze({
  definitionBytes: 512 * 1024,
  fixtureBytes: 2 * 1024 * 1024,
  totalBytes: 8 * 1024 * 1024,
  jsonDepth: 64,
  jsonNodes: 100000,
  sources: 64
});

function resourceError(resource, limit, actual) {
  return new DefinitionRuntimeError(
    "DEFINITION_RESOURCE_LIMIT",
    `Definition package exceeds the ${resource} limit`,
    { resource, limit, actual }
  );
}

function normalizeResourceLimits(overrides = {}) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new DefinitionRuntimeError("DEFINITION_RESOURCE_LIMIT", "Definition resource limits must be an object");
  }
  const unknown = Object.keys(overrides).filter((key) => !Object.hasOwn(DEFAULT_RESOURCE_LIMITS, key));
  if (unknown.length) {
    throw new DefinitionRuntimeError("DEFINITION_RESOURCE_LIMIT", "Definition resource policy contains unknown limits", {
      resources: unknown.sort()
    });
  }
  return Object.freeze(Object.fromEntries(Object.entries(DEFAULT_RESOURCE_LIMITS).map(([key, ceiling]) => {
    const requested = overrides[key];
    if (requested === undefined) return [key, ceiling];
    if (!Number.isSafeInteger(requested) || requested < 1) {
      throw new DefinitionRuntimeError("DEFINITION_RESOURCE_LIMIT", `Definition limit ${key} must be a positive integer`, {
        resource: key
      });
    }
    return [key, Math.min(requested, ceiling)];
  })));
}

function measureJson(value, limits, resource) {
  const ancestors = new Set();
  const stack = [{ value, depth: 1, exit: false }];
  let nodes = 0;

  while (stack.length) {
    const current = stack.pop();
    if (current.exit) {
      ancestors.delete(current.value);
      continue;
    }
    nodes += 1;
    if (nodes > limits.jsonNodes) throw resourceError("jsonNodes", limits.jsonNodes, nodes);
    if (current.depth > limits.jsonDepth) throw resourceError("jsonDepth", limits.jsonDepth, current.depth);

    const item = current.value;
    if (!item || typeof item !== "object") continue;
    if (ancestors.has(item)) {
      throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${resource} contains a cycle`);
    }
    ancestors.add(item);
    stack.push({ value: item, depth: current.depth, exit: true });
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const keys = Object.keys(item);
    if (keys.some((key) => descriptors[key].get || descriptors[key].set)) {
      throw new DefinitionRuntimeError("DEFINITION_VALUE_NOT_JSON", `${resource} contains accessor properties`);
    }
    for (const child of keys.map((key) => descriptors[key].value)) {
      stack.push({ value: child, depth: current.depth + 1, exit: false });
    }
  }
  return nodes;
}

class ResourceBudget {
  constructor(limits) {
    this.limits = limits;
    this.totalBytes = 0;
  }

  consume(bytes, resource, perResourceLimit) {
    if (bytes > perResourceLimit) throw resourceError(resource, perResourceLimit, bytes);
    this.totalBytes += bytes;
    if (this.totalBytes > this.limits.totalBytes) {
      throw resourceError("totalBytes", this.limits.totalBytes, this.totalBytes);
    }
  }
}

module.exports = { DEFAULT_RESOURCE_LIMITS, ResourceBudget, measureJson, normalizeResourceLimits };
