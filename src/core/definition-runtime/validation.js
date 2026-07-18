const Ajv2020 = require("ajv/dist/2020");
const { canonicalize } = require("./canonical");

const commonSchema = require("../../../definition-contract/v1/common.schema.json");
const semanticSchema = require("../../../definition-contract/v1/semantic.schema.json");
const layoutSchema = require("../../../definition-contract/v1/layout-presentation.schema.json");
const definitionSchema = require("../../../definition-contract/v1/diagram-definition.schema.json");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
ajv.addSchema(commonSchema).addSchema(semanticSchema).addSchema(layoutSchema);
const validateSchema = ajv.compile(definitionSchema);

const issue = (code, pathValue, message, details = {}) => ({ code, path: pathValue || "$", message, details });
const duplicateIds = (items = []) => items.map((item) => item?.id).filter((id, index, ids) => id && ids.indexOf(id) !== index);

function schemaIssues(definition) {
  if (validateSchema(definition)) return [];
  return validateSchema.errors.map((error) => issue(
    `SCHEMA_${error.keyword.toUpperCase()}`,
    error.instancePath || "$",
    error.message || "Schema validation failed",
    error.params
  ));
}

function invariantIssues(definition) {
  const issues = [];
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) return issues;
  const elementIds = new Set((definition.elementTypes || []).map((item) => item?.id).filter(Boolean));
  const relationIds = new Set((definition.relationTypes || []).map((item) => item?.id).filter(Boolean));
  const semanticRoles = new Set((definition.elementTypes || []).map((item) => item?.semanticRole).filter(Boolean));
  for (const id of duplicateIds(definition.elementTypes)) {
    issues.push(issue("ELEMENT_TYPE_ID_DUPLICATE", "/elementTypes", `Duplicate element type ${id}`, { id }));
  }
  for (const id of duplicateIds(definition.relationTypes)) {
    issues.push(issue("RELATION_TYPE_ID_DUPLICATE", "/relationTypes", `Duplicate relation type ${id}`, { id }));
  }
  for (const [index, element] of (definition.elementTypes || []).entries()) {
    for (const id of duplicateIds(element?.attributes)) {
      issues.push(issue("ATTRIBUTE_ID_DUPLICATE", `/elementTypes/${index}/attributes`, `Duplicate attribute ${id}`, { id }));
    }
    for (const [attributeIndex, attribute] of (element?.attributes || []).entries()) {
      if (attribute.valueType === "ENUM" && !attribute.enumValues?.length) {
        issues.push(issue("ENUM_VALUES_REQUIRED", `/elementTypes/${index}/attributes/${attributeIndex}/enumValues`, "Enum attribute requires values"));
      }
    }
  }
  for (const [collection, items] of [["validationRules", definition.validationRules], ["creationRecipes", definition.creationRecipes], ["fixtures", definition.fixtures]]) {
    for (const id of duplicateIds(items)) issues.push(issue("MEMBER_ID_DUPLICATE", `/${collection}`, `Duplicate member ${id}`, { id }));
  }
  if (!elementIds.has(definition.defaultElementType)) {
    issues.push(issue("DEFAULT_ELEMENT_TYPE_UNKNOWN", "/defaultElementType", "Default element type is not declared"));
  }
  if (!definition.layoutProfile?.directions?.includes(definition.layoutProfile.defaultDirection)) {
    issues.push(issue("DEFAULT_DIRECTION_NOT_ALLOWED", "/layoutProfile/defaultDirection", "Default direction is not allowed"));
  }
  if (!definition.layoutProfile?.routingStyles?.includes(definition.layoutProfile.defaultRoutingStyle)) {
    issues.push(issue("DEFAULT_ROUTING_STYLE_NOT_ALLOWED", "/layoutProfile/defaultRoutingStyle", "Default routing style is not allowed"));
  }
  for (const [index, relation] of (definition.relationTypes || []).entries()) {
    if (!relation || typeof relation !== "object") continue;
    if (!relation.logicModes?.includes(definition.logicMode)) {
      issues.push(issue("RELATION_LOGIC_MODE_MISMATCH", `/relationTypes/${index}/logicModes`, "Relation does not support the definition logic mode"));
    }
    for (const key of ["inputCardinality", "outputCardinality"]) {
      if (relation[key]?.max !== null && relation[key]?.max < relation[key]?.min) {
        issues.push(issue("CARDINALITY_RANGE_INVALID", `/relationTypes/${index}/${key}`, "Maximum cardinality is below minimum"));
      }
    }
    if (relation.assumptionPolicy?.recommended < relation.assumptionPolicy?.minimum) {
      issues.push(issue("ASSUMPTION_RECOMMENDATION_INVALID", `/relationTypes/${index}/assumptionPolicy`, "Recommended assumptions are below the minimum"));
    }
  }
  if (definition.cyclePolicy === "FORBIDDEN" && definition.layoutProfile?.cycleBreaking?.strategy !== "FORBIDDEN") {
    issues.push(issue("CYCLE_STRATEGY_MISMATCH", "/layoutProfile/cycleBreaking/strategy", "Forbidden semantic cycles require forbidden layout cycle breaking"));
  }
  if (definition.topology?.kind === "ROLE_TEMPLATE") {
    for (const [index, typeId] of definition.topology.pathTypes.entries()) {
      if (!elementIds.has(typeId)) issues.push(issue("TOPOLOGY_TYPE_UNKNOWN", `/topology/pathTypes/${index}`, "Topology references an unknown element type"));
    }
    if (!semanticRoles.has(definition.topology.sharedRole)) {
      issues.push(issue("TOPOLOGY_ROLE_UNKNOWN", "/topology/sharedRole", "Topology references an unknown semantic role"));
    }
  }
  const elementStyleIds = (definition.presentation?.elementStyles || []).map((item) => item?.typeId).filter(Boolean);
  const relationStyleIds = (definition.presentation?.relationStyles || []).map((item) => item?.typeId).filter(Boolean);
  for (const id of elementIds) {
    if (!elementStyleIds.includes(id)) issues.push(issue("ELEMENT_STYLE_MISSING", "/presentation/elementStyles", `Element type ${id} has no style`, { id }));
  }
  for (const id of relationIds) {
    if (!relationStyleIds.includes(id)) issues.push(issue("RELATION_STYLE_MISSING", "/presentation/relationStyles", `Relation type ${id} has no style`, { id }));
  }
  for (const id of elementStyleIds.filter((id, index, ids) => ids.indexOf(id) !== index)) {
    issues.push(issue("ELEMENT_STYLE_DUPLICATE", "/presentation/elementStyles", `Duplicate element style ${id}`, { id }));
  }
  for (const id of relationStyleIds.filter((id, index, ids) => ids.indexOf(id) !== index)) {
    issues.push(issue("RELATION_STYLE_DUPLICATE", "/presentation/relationStyles", `Duplicate relation style ${id}`, { id }));
  }
  for (const [index, style] of (definition.presentation?.elementStyles || []).entries()) {
    if (!style || typeof style !== "object") continue;
    if (!elementIds.has(style.typeId)) issues.push(issue("ELEMENT_STYLE_TYPE_UNKNOWN", `/presentation/elementStyles/${index}/typeId`, "Element style references an unknown type"));
  }
  for (const [index, style] of (definition.presentation?.relationStyles || []).entries()) {
    if (!style || typeof style !== "object") continue;
    if (!relationIds.has(style.typeId)) issues.push(issue("RELATION_STYLE_TYPE_UNKNOWN", `/presentation/relationStyles/${index}/typeId`, "Relation style references an unknown type"));
  }
  return issues;
}

function validateDefinition(candidate) {
  let definition;
  try {
    definition = canonicalize(candidate);
  } catch (error) {
    return { valid: false, diagnostics: [issue(error.code || "DEFINITION_VALUE_NOT_JSON", error.details?.path, error.message)] };
  }
  const diagnostics = [...schemaIssues(definition), ...invariantIssues(definition)]
    .sort((left, right) => {
      const leftKey = `${left.path}:${left.code}`;
      const rightKey = `${right.path}:${right.code}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
  return { valid: diagnostics.length === 0, diagnostics };
}

module.exports = { definitionSchema, validateDefinition };
