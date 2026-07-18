const { createDefinitionPin } = require("./pins");
const { DefinitionRuntimeError } = require("./errors");

const KNOWN_RULES = new Set([
  "semantic.graph-element-types.v1",
  "semantic.element-count.v1",
  "semantic.role-policy.v1",
  "semantic.branch-topology.v1",
  "semantic.assumption-coverage.v1"
]);
const KNOWN_CONSTRAINTS = new Set([
  "compatibility.legacy-registry.v1",
  "layout.role-columns.v1"
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function fail(message, details = {}) {
  throw new DefinitionRuntimeError("DEFINITION_COMPILE_INVALID", message, details);
}

function lowerCamel(value) {
  const words = value.toLowerCase().split("_");
  return words[0] + words.slice(1).map((word) => word[0].toUpperCase() + word.slice(1)).join("");
}

function unsupportedCapabilities(definition) {
  return [
    ...definition.validationRules.map((item) => item.capability).filter((item) => !KNOWN_RULES.has(item)),
    ...(definition.presentation.constraints || []).map((item) => item.capability).filter((item) => !KNOWN_CONSTRAINTS.has(item)),
    ...definition.creationRecipes.map((item) => item.capability)
  ].sort();
}

function rule(definition, capability) {
  return definition.validationRules.filter((item) => item.capability === capability);
}

function singleRule(definition, capability) {
  const matches = rule(definition, capability);
  if (matches.length > 1) fail(`Capability ${capability} must be unique`, { capability });
  return matches[0]?.parameters || null;
}

function constraint(definition, capability) {
  const matches = (definition.presentation.constraints || []).filter((item) => item.capability === capability);
  if (matches.length > 1) fail(`Capability ${capability} must be unique`, { capability });
  return matches[0]?.parameters || null;
}

function compileSemanticProfile(definition, semanticDiagramType) {
  const explicitGraphTypes = singleRule(definition, "semantic.graph-element-types.v1")?.types;
  const graphTypes = explicitGraphTypes || definition.elementTypes.filter((item) => !item.synthetic).map((item) => item.id);
  const declaredTypes = new Set(definition.elementTypes.map((item) => item.id));
  for (const type of graphTypes) {
    if (!declaredTypes.has(type)) fail("Graph element type is not declared", { type });
  }
  const profile = {
    logicMode: definition.logicMode,
    defaultInputCombination: definition.defaultInputCombination,
    allowedElementTypes: graphTypes,
    allowedRelationTypes: definition.relationTypes.map((item) => item.id),
    allowedCombinations: [...new Set(definition.relationTypes.flatMap((item) => item.combinations))],
    cyclePolicy: definition.cyclePolicy
  };

  for (const item of rule(definition, "semantic.element-count.v1")) {
    const { type, required, recommended } = item.parameters;
    if (!graphTypes.includes(type) || (!required && !recommended)) fail("Element-count rule is malformed", { ruleId: item.id });
    if (required) (profile.requiredElementCounts ||= {})[type] = required;
    if (recommended) (profile.recommendedElementCounts ||= {})[type] = recommended;
  }
  const rolePolicy = singleRule(definition, "semantic.role-policy.v1");
  if (rolePolicy) Object.assign(profile, rolePolicy);
  const topology = singleRule(definition, "semantic.branch-topology.v1");
  if (topology) profile.branchTopology = topology;
  const coverage = singleRule(definition, "semantic.assumption-coverage.v1");
  if (coverage) {
    profile.assumptionPolicy = {
      ...coverage,
      prompts: Object.fromEntries(definition.relationTypes
        .filter((item) => item.assumptionPolicy.prompt)
        .map((item) => [item.id, item.assumptionPolicy.prompt]))
    };
  }
  if (definition.topology.kind === "ROLE_TEMPLATE") {
    const roleColumns = constraint(definition, "layout.role-columns.v1") || {};
    profile.canonicalPresentation = {
      direction: definition.layoutProfile.defaultDirection,
      columnTypes: roleColumns.columnTypes || [...definition.topology.pathTypes].reverse(),
      branchField: definition.topology.branchField,
      branchPathTypes: definition.topology.pathTypes,
      sharedRole: definition.topology.sharedRole
    };
  }
  return { id: semanticDiagramType, profile };
}

function compileRegistryDefinition(definition, artifact, compatibility, semanticProfile) {
  const aliases = compatibility?.elementTypeAliases || {};
  const alias = (typeId) => aliases[typeId] || lowerCamel(typeId);
  const graphTypes = new Set(semanticProfile.allowedElementTypes);
  const legacyUniqueTypes = new Set(compatibility?.uniqueElementTypes || definition.elementTypes
    .filter((item) => item.unique)
    .map((item) => item.id));
  const registry = {
    id: compatibility?.runtimeId || definition.id,
    definitionId: definition.id,
    definitionVersion: definition.version,
    definitionHash: artifact.hash,
    semanticDiagramType: compatibility?.semanticDiagramType || definition.id,
    label: definition.label,
    defaultDirection: definition.layoutProfile.defaultDirection,
    layering: lowerCamel(definition.layoutProfile.layering),
    cycleBreaking: {
      strategy: compatibility?.cycleBreakingStrategy || lowerCamel(definition.layoutProfile.cycleBreaking.strategy),
      restoreSemanticEdges: definition.layoutProfile.cycleBreaking.restoreSemanticEdges
    },
    directions: definition.layoutProfile.directions,
    defaultRoutingStyle: definition.layoutProfile.defaultRoutingStyle,
    routingStyles: definition.layoutProfile.routingStyles.map((id) => ({
      id,
      label: id[0] + id.slice(1).toLowerCase()
    })),
    defaultNodeType: alias(definition.defaultElementType),
    nodeTypes: definition.elementTypes.map((item) => {
      const nodeType = {
        id: alias(item.id),
        semanticType: graphTypes.has(item.id) ? item.id : null,
        label: item.label,
        shortLabel: item.shortLabel
      };
      if (legacyUniqueTypes.has(item.id)) nodeType.unique = true;
      if (item.synthetic) nodeType.synthetic = true;
      if (item.semanticRole) nodeType.semanticRole = item.semanticRole;
      return nodeType;
    })
  };
  const roleColumns = constraint(definition, "layout.role-columns.v1");
  if (roleColumns) registry.canonicalPresentation = roleColumns;
  return registry;
}

function validateCompatibility(definition, compatibility) {
  if (!compatibility) return;
  for (const field of ["runtimeId", "semanticDiagramType"]) {
    if (typeof compatibility[field] !== "string" || !compatibility[field].trim()) {
      fail(`Compatibility ${field} must be a non-empty string`, { field });
    }
  }
  const typeIds = new Set(definition.elementTypes.map((item) => item.id));
  const aliases = compatibility.elementTypeAliases || {};
  for (const [type, alias] of Object.entries(aliases)) {
    if (!typeIds.has(type) || typeof alias !== "string" || !alias.trim()) {
      fail("Element type alias is invalid", { type });
    }
  }
  const projectedIds = definition.elementTypes.map((item) => aliases[item.id] || lowerCamel(item.id));
  if (new Set(projectedIds).size !== projectedIds.length) fail("Element type aliases collide", { projectedIds });
  for (const type of compatibility.uniqueElementTypes || []) {
    if (!typeIds.has(type)) fail("Unique element type is not declared", { type });
  }
}

function compileDefinition(definitionPackage) {
  const pin = createDefinitionPin(definitionPackage);
  const artifact = definitionPackage.artifact || definitionPackage;
  const definition = artifact.definition;
  const unsupported = unsupportedCapabilities(definition);
  if (unsupported.length) {
    throw new DefinitionRuntimeError("DEFINITION_CAPABILITY_UNSUPPORTED", "Definition uses unknown compile capabilities", {
      capabilities: unsupported
    });
  }
  const compatibility = constraint(definition, "compatibility.legacy-registry.v1");
  validateCompatibility(definition, compatibility);
  const semanticDiagramType = compatibility?.semanticDiagramType || definition.id;
  const semantic = compileSemanticProfile(definition, semanticDiagramType);
  return deepFreeze({
    contractVersion: 1,
    pin,
    runtimeId: compatibility?.runtimeId || definition.id,
    semanticDiagramType,
    registryDefinition: compileRegistryDefinition(definition, artifact, compatibility, semantic.profile),
    semanticProfile: semantic.profile,
    fixtures: definitionPackage.fixtures || {}
  });
}

module.exports = { compileDefinition };
