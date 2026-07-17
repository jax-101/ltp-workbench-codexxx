const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validateSemanticGraph } = require("../src/core/semantic-validator");

const root = path.join(__dirname, "..", "semantic-contract", "v0.1");
const contract = JSON.parse(fs.readFileSync(path.join(root, "contract.json"), "utf8"));

const issue = (issues, severity, code, pathValue, message) => {
  issues.push({ severity, code, path: pathValue, message });
};

const countByType = (elements) => {
  const counts = new Map();
  for (const element of elements) counts.set(element.type, (counts.get(element.type) || 0) + 1);
  return counts;
};

const relationEndpoints = (relation, key) => Array.isArray(relation[key]) ? relation[key] : [];

const graphHasCycle = (fixture) => {
  const adjacency = new Map(fixture.elements.map((element) => [element.id, []]));
  for (const relation of fixture.relations || []) {
    if (relation.type === "CONFLICT") continue;
    for (const input of relationEndpoints(relation, "inputs")) {
      for (const output of relationEndpoints(relation, "outputs")) {
        if (adjacency.has(input.elementId)) adjacency.get(input.elementId).push(output.elementId);
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of adjacency.get(id) || []) if (visit(next)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...adjacency.keys()].some(visit);
};

const validateBranchTopologyReference = ({ elements, relations, profile, issues }) => {
  const topology = profile.branchTopology;
  if (!topology) return;
  const branchField = topology.branchField || "branchId";
  const needs = elements.filter((element) => element.type === topology.needType);
  const wants = elements.filter((element) => element.type === topology.wantType);
  const objective = elements.find((element) => element.role === topology.objectiveRole);
  const branchedElements = [...needs, ...wants];
  for (const element of branchedElements) {
    if (typeof element[branchField] !== "string" || !element[branchField].trim()) {
      issue(issues, "ERROR", "EC_BRANCH_ID_REQUIRED", `elements.${element.id}.${branchField}`, `${element.type} requires a stable ${branchField}`);
    }
  }
  const branchIds = [...new Set(branchedElements
    .map((element) => element[branchField])
    .filter((value) => typeof value === "string" && value.trim()))];
  if (branchIds.length < topology.minimumBranches) {
    issue(issues, "ERROR", "EC_BRANCH_COUNT", `elements.${branchField}`, `EC requires at least ${topology.minimumBranches} branches`);
  }
  const simpleEdges = relations.filter((relation) => relation.type === topology.relationType
    && relation.combination === "SIMPLE"
    && relationEndpoints(relation, "inputs").length === 1
    && relationEndpoints(relation, "outputs").length === 1);
  const edgeCount = (sourceId, targetId) => simpleEdges.filter((relation) => relation.inputs[0].elementId === sourceId
    && relation.outputs[0].elementId === targetId).length;
  for (const branchId of branchIds) {
    const branchNeeds = needs.filter((element) => element[branchField] === branchId);
    const branchWants = wants.filter((element) => element[branchField] === branchId);
    if (branchNeeds.length !== 1 || branchWants.length !== 1) {
      issue(issues, "ERROR", "EC_BRANCH_CARDINALITY", `elements.${branchField}.${branchId}`, `Branch ${branchId} requires exactly one ${topology.needType} and one ${topology.wantType}`);
      continue;
    }
    if (objective && edgeCount(branchNeeds[0].id, objective.id) !== 1) {
      issue(issues, "ERROR", "EC_BRANCH_RELATION_REQUIRED", `relations.${branchId}.need-objective`, `Branch ${branchId} requires exactly one ${topology.needType}-to-objective relation`);
    }
    if (edgeCount(branchWants[0].id, branchNeeds[0].id) !== 1) {
      issue(issues, "ERROR", "EC_BRANCH_RELATION_REQUIRED", `relations.${branchId}.want-need`, `Branch ${branchId} requires exactly one ${topology.wantType}-to-${topology.needType} relation`);
    }
  }
  const elementById = new Map(elements.map((element) => [element.id, element]));
  for (const relation of simpleEdges) {
    const source = elementById.get(relation.inputs[0].elementId);
    const target = elementById.get(relation.outputs[0].elementId);
    if (source?.type === topology.wantType && target?.type === topology.needType
      && source[branchField] && target[branchField] && source[branchField] !== target[branchField]) {
      issue(issues, "ERROR", "EC_BRANCH_RELATION_MISMATCH", `relations.${relation.id}`, `${topology.wantType}-to-${topology.needType} relations must remain inside one branch`);
    }
  }
  if (topology.conflictGraph !== "CONNECTED" || branchIds.length === 0) return;
  const adjacency = new Map(branchIds.map((branchId) => [branchId, new Set()]));
  for (const relation of relations.filter((candidate) => candidate.type === topology.conflictType)) {
    const endpoints = relationEndpoints(relation, "inputs").map((input) => elementById.get(input.elementId));
    const valid = endpoints.length === 2
      && endpoints.every((element) => element?.type === topology.wantType && adjacency.has(element[branchField]))
      && endpoints[0][branchField] !== endpoints[1][branchField];
    if (!valid) {
      issue(issues, "ERROR", "EC_CONFLICT_ENDPOINT_INVALID", `relations.${relation.id}`, "Conflicts must connect wants from two different branches");
      continue;
    }
    const [left, right] = endpoints.map((element) => element[branchField]);
    adjacency.get(left).add(right);
    adjacency.get(right).add(left);
  }
  const visited = new Set();
  const pending = [branchIds[0]];
  while (pending.length) {
    const branchId = pending.pop();
    if (visited.has(branchId)) continue;
    visited.add(branchId);
    pending.push(...adjacency.get(branchId));
  }
  if (visited.size !== branchIds.length) {
    issue(issues, "ERROR", "EC_CONFLICT_GRAPH_DISCONNECTED", "relations.CONFLICT", "Every EC branch must participate in the connected conflict graph");
  }
};

const validateFixtureReference = (fixture) => {
  const issues = [];
  const profile = contract.profiles[fixture.diagramType];
  if (!profile) {
    issue(issues, "ERROR", "UNKNOWN_DIAGRAM_TYPE", "diagramType", `Unknown diagram type ${fixture.diagramType}`);
    return issues;
  }
  if (fixture.logicMode !== profile.logicMode) {
    issue(issues, "ERROR", "LOGIC_MODE_MISMATCH", "logicMode", `Expected ${profile.logicMode}`);
  }

  const elements = Array.isArray(fixture.elements) ? fixture.elements : [];
  const relations = Array.isArray(fixture.relations) ? fixture.relations : [];
  const assumptions = Array.isArray(fixture.assumptions) ? fixture.assumptions : [];
  const derivations = Array.isArray(fixture.derivations) ? fixture.derivations : [];
  const allItems = [...elements, ...relations, ...assumptions, ...derivations];
  const ids = new Set();
  for (const item of allItems) {
    if (!item.id || ids.has(item.id)) issue(issues, "ERROR", "DUPLICATE_OR_MISSING_ID", item.id || "?", "IDs must be present and unique");
    ids.add(item.id);
  }

  const elementById = new Map(elements.map((element) => [element.id, element]));
  const relationById = new Map(relations.map((relation) => [relation.id, relation]));
  const assumptionById = new Map(assumptions.map((assumption) => [assumption.id, assumption]));

  if (fixture.reviewState && !contract.reviewStates.includes(fixture.reviewState)) {
    issue(issues, "ERROR", "REVIEW_STATE_INVALID", "reviewState", `${fixture.reviewState} is invalid`);
  }

  const requiredRoles = profile.requiredRoles || {};
  const allowedRoles = new Set(Object.keys(requiredRoles));
  for (const element of elements) {
    if (element.role && !profile.allowAdditionalRoles && !allowedRoles.has(element.role)) {
      issue(issues, "ERROR", "ROLE_NOT_ALLOWED", `elements.${element.id}.role`, `${element.role} is not a canonical role`);
    }
  }
  if (profile.uniqueRoles) {
    const roleCounts = new Map();
    for (const element of elements) {
      if (element.role) roleCounts.set(element.role, (roleCounts.get(element.role) || 0) + 1);
    }
    for (const [role, count] of roleCounts) {
      if (count > 1) issue(issues, "ERROR", "ROLE_CARDINALITY", `elements.role.${role}`, `Role ${role} must occur at most once`);
    }
  }
  for (const [role, expectedType] of Object.entries(requiredRoles)) {
    const matches = elements.filter((element) => element.role === role);
    if (matches.length !== 1) {
      issue(issues, "ERROR", "ROLE_CARDINALITY", `elements.role.${role}`, `Role ${role} must occur exactly once`);
    } else if (matches[0].type !== expectedType) {
      issue(issues, "ERROR", "ROLE_TYPE_MISMATCH", `elements.${matches[0].id}.role`, `Role ${role} requires ${expectedType}`);
    }
  }

  for (const element of elements) {
    if (!profile.allowedElementTypes.includes(element.type)) {
      issue(issues, "ERROR", "ELEMENT_TYPE_NOT_ALLOWED", `elements.${element.id}.type`, `${element.type} is not allowed`);
    }
    if (!element.statement) issue(issues, "ERROR", "STATEMENT_REQUIRED", `elements.${element.id}.statement`, "Statement is required");
  }

  for (const relation of relations) {
    const relationPath = `relations.${relation.id}`;
    const relationType = contract.relationTypes[relation.type];
    const combination = relation.combination === null ? null : contract.combinations[relation.combination];
    const inputs = relationEndpoints(relation, "inputs");
    const outputs = relationEndpoints(relation, "outputs");
    if (!relationType || !profile.allowedRelationTypes.includes(relation.type)) {
      issue(issues, "ERROR", "RELATION_TYPE_NOT_ALLOWED", `${relationPath}.type`, `${relation.type} is not allowed`);
      continue;
    }
    if (!relationType.logicModes.includes(fixture.logicMode)) {
      issue(issues, "ERROR", "RELATION_LOGIC_MISMATCH", `${relationPath}.type`, `${relation.type} does not support ${fixture.logicMode}`);
    }
    const relationAllowsNoCombination = relation.combination === null && relationType.combinations?.includes(null);
    if (!relationAllowsNoCombination && (!combination || !profile.allowedCombinations.includes(relation.combination))) {
      issue(issues, "ERROR", "COMBINATION_NOT_ALLOWED", `${relationPath}.combination`, `${relation.combination} is not allowed`);
      continue;
    }
    if (relationType.combinations && !relationType.combinations.includes(relation.combination)) {
      issue(issues, "ERROR", "COMBINATION_RELATION_MISMATCH", `${relationPath}.combination`, `${relation.combination} is invalid for ${relation.type}`);
    }
    const minInputs = relationType.minInputs ?? combination.minInputs;
    const maxInputs = relationType.maxInputs ?? combination.maxInputs;
    if (inputs.length < minInputs || (maxInputs !== null && inputs.length > maxInputs)) {
      issue(issues, "ERROR", "INPUT_ARITY", `${relationPath}.inputs`, `${relation.combination} requires ${minInputs}${maxInputs === null ? "+" : `-${maxInputs}`} input(s)`);
    }
    if (outputs.length < relationType.minOutputs || (relationType.maxOutputs !== null && outputs.length > relationType.maxOutputs)) {
      issue(issues, "ERROR", "OUTPUT_ARITY", `${relationPath}.outputs`, `${relation.type} has invalid output arity`);
    }
    const allowedRenderModes = relationType.renderModes || combination.renderModes;
    if (!allowedRenderModes.includes(relation.renderMode)) {
      issue(issues, "ERROR", "RENDER_MODE_MISMATCH", `${relationPath}.renderMode`, `${relation.renderMode} is invalid for ${relation.combination}`);
    }
    for (const endpoint of [...inputs, ...outputs]) {
      if (!elementById.has(endpoint.elementId)) {
        issue(issues, "ERROR", "ENDPOINT_MISSING", relationPath, `Element ${endpoint.elementId} does not exist`);
      }
    }
    if (relation.combination === "MAG") {
      const quantified = inputs.filter((input) => Number.isFinite(input.contribution));
      if (quantified.length > 0 && quantified.length !== inputs.length) {
        issue(issues, "ERROR", "MAG_PARTIAL_QUANTIFICATION", `${relationPath}.inputs`, "MAG contributions must be all quantified or all qualitative");
      }
      if (quantified.some((input) => input.contribution <= 0)) {
        issue(issues, "ERROR", "MAG_NON_POSITIVE_CONTRIBUTION", `${relationPath}.inputs`, "MAG contributions must be positive");
      }
      if (quantified.length === 0) {
        issue(issues, "WARNING", "MAG_CONTRIBUTION_UNQUANTIFIED", `${relationPath}.inputs`, "MAG is valid but its contribution remains qualitative");
      }
    }
  }

  for (const assumption of assumptions) {
    const assumptionPath = `assumptions.${assumption.id}`;
    const subject = assumption.subject || {};
    const relation = relationById.get(subject.relationId);
    if (!assumption.statement) issue(issues, "ERROR", "ASSUMPTION_STATEMENT_REQUIRED", `${assumptionPath}.statement`, "Statement is required");
    if (assumption.status && !contract.assumptionStatuses.includes(assumption.status)) {
      issue(issues, "ERROR", "ASSUMPTION_STATUS_INVALID", `${assumptionPath}.status`, `${assumption.status} is invalid`);
    }
    if (!contract.assumptionScopes.includes(subject.kind)) {
      issue(issues, "ERROR", "ASSUMPTION_SCOPE_INVALID", `${assumptionPath}.subject.kind`, `${subject.kind} is invalid`);
      continue;
    }
    if (!relation) {
      issue(issues, "ERROR", "ASSUMPTION_RELATION_MISSING", `${assumptionPath}.subject.relationId`, "Subject relation does not exist");
      continue;
    }
    if (subject.kind === "INPUT" && !relation.inputs.some((input) => input.elementId === subject.elementId)) {
      issue(issues, "ERROR", "ASSUMPTION_INPUT_MISSING", `${assumptionPath}.subject.elementId`, "Input is not part of the relation");
    }
    if (subject.kind === "OUTPUT" && !relation.outputs.some((output) => output.elementId === subject.elementId)) {
      issue(issues, "ERROR", "ASSUMPTION_OUTPUT_MISSING", `${assumptionPath}.subject.elementId`, "Output is not part of the relation");
    }
    if (subject.kind === "CONFLICT" && relation.type !== "CONFLICT") {
      issue(issues, "ERROR", "ASSUMPTION_CONFLICT_MISMATCH", assumptionPath, "Conflict scope requires a conflict relation");
    }
    if (relation.type === "CONFLICT" && profile.assumptionPolicy?.conflictSubjectKind && subject.kind !== profile.assumptionPolicy.conflictSubjectKind) {
      issue(issues, "ERROR", "ASSUMPTION_CONFLICT_SCOPE_REQUIRED", assumptionPath, `Conflict assumptions must use ${profile.assumptionPolicy.conflictSubjectKind} scope`);
    }
  }

  if (profile.assumptionPolicy) {
    for (const relation of relations) {
      const covered = assumptions.filter((assumption) => {
        if (assumption.subject?.relationId !== relation.id) return false;
        if (relation.type !== "CONFLICT") return true;
        return assumption.subject.kind === profile.assumptionPolicy.conflictSubjectKind;
      }).length;
      if (covered < profile.assumptionPolicy.minimumPerRelation) {
        const severity = fixture.reviewState === "ACCEPTED" && profile.assumptionPolicy.acceptedReviewRequiresCoverage ? "ERROR" : "WARNING";
        issue(issues, severity, "ASSUMPTION_COVERAGE_REQUIRED", `relations.${relation.id}`, `Relation ${relation.id} needs assumptions behind it`);
      } else if (covered < profile.assumptionPolicy.recommendedPerRelation) {
        issue(issues, "WARNING", "ASSUMPTION_DEPTH_RECOMMENDED", `relations.${relation.id}`, `Relation ${relation.id} should expose at least ${profile.assumptionPolicy.recommendedPerRelation} assumptions`);
      }
    }
  }

  for (const derivation of derivations) {
    const derivationPath = `derivations.${derivation.id}`;
    if (!contract.derivationTypes.includes(derivation.type)) {
      issue(issues, "ERROR", "DERIVATION_TYPE_INVALID", `${derivationPath}.type`, `${derivation.type} is invalid`);
    }
    if (!contract.derivationStatuses.includes(derivation.status)) {
      issue(issues, "ERROR", "DERIVATION_STATUS_INVALID", `${derivationPath}.status`, `${derivation.status} is invalid`);
    }
    if (!elementById.has(derivation.sourceElementId)) {
      issue(issues, "ERROR", "DERIVATION_SOURCE_MISSING", `${derivationPath}.sourceElementId`, "Source element does not exist");
    }
    if (derivation.targetAssumptionId && !assumptionById.has(derivation.targetAssumptionId)) {
      issue(issues, "ERROR", "DERIVATION_TARGET_MISSING", `${derivationPath}.targetAssumptionId`, "Target assumption does not exist");
    }
    if (derivation.targetElementId && !elementById.has(derivation.targetElementId)) {
      issue(issues, "ERROR", "DERIVATION_TARGET_MISSING", `${derivationPath}.targetElementId`, "Target element does not exist");
    }
  }

  const counts = countByType(elements);
  for (const [type, range] of Object.entries(profile.requiredElementCounts || {})) {
    const count = counts.get(type) || 0;
    if (count < range.min || (range.max !== null && count > range.max)) {
      issue(issues, "ERROR", "ELEMENT_COUNT", `elements.${type}`, `${type} count ${count} is outside required range`);
    }
  }
  for (const [type, range] of Object.entries(profile.recommendedElementCounts || {})) {
    const count = counts.get(type) || 0;
    if (count < range.min || (range.max !== null && count > range.max)) {
      issue(issues, "WARNING", "ELEMENT_COUNT_RECOMMENDED", `elements.${type}`, `${type} count ${count} is outside recommended range`);
    }
  }
  for (const pattern of profile.requiredRelationPatterns || []) {
    const count = relations.filter((relation) => {
      if (relation.type !== pattern.type) return false;
      const inputElements = relation.inputs.map((input) => elementById.get(input.elementId));
      const outputElements = relation.outputs.map((output) => elementById.get(output.elementId));
      const inputMatches = pattern.inputRole
        ? inputElements.some((element) => element?.role === pattern.inputRole)
        : inputElements.some((element) => element?.type === pattern.inputType);
      const secondInputMatches = !pattern.secondInputRole || inputElements.some((element) => element?.role === pattern.secondInputRole);
      const outputMatches = pattern.outputType === null
        || (pattern.outputRole
          ? outputElements.some((element) => element?.role === pattern.outputRole)
          : outputElements.some((element) => element?.type === pattern.outputType));
      return inputMatches && secondInputMatches && outputMatches;
    }).length;
    if (count < pattern.min) issue(issues, "ERROR", "RELATION_PATTERN_REQUIRED", `relations.${pattern.id}`, `${pattern.id} requires ${pattern.min} relation(s)`);
  }

  validateBranchTopologyReference({ elements, relations, profile, issues });

  if (profile.cyclePolicy === "FORBIDDEN" && graphHasCycle(fixture)) {
    issue(issues, "ERROR", "CYCLE_FORBIDDEN", "relations", `${fixture.diagramType} cannot contain a directed cycle`);
  }
  return issues;
};

const validateFixture = (fixture) => validateSemanticGraph(fixture, contract);

const elementLabel = (elementById, endpoint) => elementById.get(endpoint.elementId)?.statement || endpoint.elementId;
const relationInputLabels = (fixture, relation) => {
  const elementById = new Map(fixture.elements.map((element) => [element.id, element]));
  return [...relation.inputs]
    .sort((left, right) => left.elementId.localeCompare(right.elementId))
    .map((endpoint) => elementLabel(elementById, endpoint));
};

const verbalizeRelation = (fixture, relation) => {
  const elementById = new Map(fixture.elements.map((element) => [element.id, element]));
  const inputs = relationInputLabels(fixture, relation);
  if (relation.type === "CONFLICT") return `${inputs[0]} conflicts with ${inputs[1]}.`;
  const output = elementLabel(elementById, relation.outputs[0]);
  if (relation.combination === "SIMPLE" && fixture.logicMode === "NECESSITY") return `In order to achieve ${output}, we must have ${inputs[0]}.`;
  if (relation.combination === "SIMPLE") return `If ${inputs[0]}, then ${output}.`;
  if (relation.combination === "AND") return `If ${inputs.join(" and ")}, then ${output}.`;
  if (relation.combination === "OR") return `If ${inputs.join(" or ")}, then ${output}.`;
  if (relation.combination === "MAG") return `${inputs.join(" and ")} each add to the magnitude of ${output}.`;
  if (inputs.length === 2) return `If either ${inputs[0]} or ${inputs[1]}, but not both, then ${output}.`;
  return `If exactly one of ${inputs.join(", ")} occurs, then ${output}.`;
};

const targetExpression = (fixture, targetId) => {
  const profile = contract.profiles[fixture.diagramType];
  const incoming = fixture.relations
    .filter((relation) => relation.type !== "CONFLICT" && relation.outputs.some((output) => output.elementId === targetId))
    .sort((left, right) => left.id.localeCompare(right.id));
  const group = (relation) => {
    const labels = relationInputLabels(fixture, relation);
    if (relation.combination === "SIMPLE") return labels[0];
    return `(${labels.join(` ${relation.combination} `)})`;
  };
  return incoming.map(group).join(` ${profile.defaultInputCombination} `);
};

const junctionId = (relation) => relation.renderMode === "JUNCTION" ? `junction:${relation.id}` : null;

const assumptionPrompt = (fixture, relation) => {
  const profile = contract.profiles[fixture.diagramType];
  const template = profile.assumptionPolicy?.prompts?.[relation.type];
  if (!template) return null;
  const elementById = new Map(fixture.elements.map((element) => [element.id, element]));
  const inputLabels = relation.inputs.map((input) => elementById.get(input.elementId)?.statement || input.elementId);
  const outputLabel = relation.outputs[0] ? elementById.get(relation.outputs[0].elementId)?.statement || relation.outputs[0].elementId : "";
  return template
    .replace("{output}", outputLabel)
    .replace("{input}", inputLabels[0] || "")
    .replace("{input1}", inputLabels[0] || "")
    .replace("{input2}", inputLabels[1] || "");
};

const loadFixtures = () => fs.readdirSync(root)
  .filter((name) => name.endsWith(".json") && name !== "contract.json")
  .flatMap((name) => {
    const value = JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
    return Array.isArray(value) ? value : [value];
  });

const normalizeCodes = (issues, severity) => issues
  .filter((entry) => entry.severity === severity)
  .map((entry) => entry.code)
  .sort();

const fixtures = loadFixtures();
assert(fixtures.length >= 10, "The conformance suite must contain intermediate fixtures");
for (const [name, combination] of Object.entries(contract.combinations)) {
  assert(combination.minInputs >= 1, `${name}: minInputs`);
  assert(combination.maxInputs === null || combination.maxInputs >= combination.minInputs, `${name}: maxInputs`);
  assert(combination.renderModes.length > 0, `${name}: render modes`);
}
for (const [name, profile] of Object.entries(contract.profiles)) {
  assert(["NECESSITY", "SUFFICIENCY"].includes(profile.logicMode), `${name}: logic mode`);
  assert(["AND", "OR"].includes(profile.defaultInputCombination), `${name}: default combination`);
  assert(profile.allowedCombinations.every((value) => contract.combinations[value]), `${name}: known combinations`);
  assert(profile.allowedRelationTypes.every((value) => contract.relationTypes[value]), `${name}: known relation types`);
}
assert.deepEqual(contract.profiles.EC.canonicalPresentation.columnTypes, ["OBJECTIVE", "NEED", "WANT"]);
assert.deepEqual(contract.profiles.EC.canonicalPresentation.branchPathTypes, ["WANT", "NEED", "OBJECTIVE"]);
assert.equal(contract.profiles.EC.canonicalPresentation.branchField, "branchId");
for (const fixture of fixtures) {
  const issues = validateFixture(fixture);
  assert.deepEqual(issues, validateFixtureReference(fixture), `${fixture.id}: shared validator parity`);
  assert.deepEqual(normalizeCodes(issues, "ERROR"), [...(fixture.expected.errorCodes || [])].sort(), `${fixture.id}: error codes`);
  assert.deepEqual(normalizeCodes(issues, "WARNING"), [...(fixture.expected.warningCodes || [])].sort(), `${fixture.id}: warning codes`);
  for (const [relationId, expected] of Object.entries(fixture.expected.verbalizations || {})) {
    const relation = fixture.relations.find((candidate) => candidate.id === relationId);
    assert.equal(verbalizeRelation(fixture, relation), expected, `${fixture.id}: verbalization ${relationId}`);
  }
  for (const [targetId, expected] of Object.entries(fixture.expected.targetExpressions || {})) {
    assert.equal(targetExpression(fixture, targetId), expected, `${fixture.id}: target expression ${targetId}`);
  }
  assert.deepEqual(
    fixture.relations.map(junctionId).filter(Boolean).sort(),
    [...(fixture.expected.junctionIds || [])].sort(),
    `${fixture.id}: junction IDs`
  );
  assert.deepEqual(JSON.parse(JSON.stringify(fixture)), fixture, `${fixture.id}: JSON round trip`);
  if (typeof fixture.expected.hasCycle === "boolean") {
    assert.equal(graphHasCycle(fixture), fixture.expected.hasCycle, `${fixture.id}: cycle expectation`);
  }
  for (const [tag, expectedCount] of Object.entries(fixture.expected.relationTagCounts || {})) {
    const actualCount = fixture.relations.filter((relation) => (relation.tags || []).includes(tag)).length;
    assert.equal(actualCount, expectedCount, `${fixture.id}: relation tag ${tag}`);
  }
  for (const [type, expectedCount] of Object.entries(fixture.expected.derivationTypeCounts || {})) {
    const actualCount = (fixture.derivations || []).filter((derivation) => derivation.type === type).length;
    assert.equal(actualCount, expectedCount, `${fixture.id}: derivation type ${type}`);
  }
  for (const [scope, expectedCount] of Object.entries(fixture.expected.assumptionScopeCounts || {})) {
    const actualCount = (fixture.assumptions || []).filter((assumption) => assumption.subject?.kind === scope).length;
    assert.equal(actualCount, expectedCount, `${fixture.id}: assumption scope ${scope}`);
  }
  for (const [role, expectedType] of Object.entries(fixture.expected.roleTypes || {})) {
    const matches = fixture.elements.filter((element) => element.role === role);
    assert.equal(matches.length, 1, `${fixture.id}: canonical role ${role}`);
    assert.equal(matches[0].type, expectedType, `${fixture.id}: canonical role type ${role}`);
  }
  for (const [relationId, expectedCount] of Object.entries(fixture.expected.assumptionsPerRelation || {})) {
    const actualCount = fixture.assumptions.filter((assumption) => assumption.subject?.relationId === relationId).length;
    assert.equal(actualCount, expectedCount, `${fixture.id}: assumptions for ${relationId}`);
  }
  for (const [relationId, expectedPrompt] of Object.entries(fixture.expected.assumptionPrompts || {})) {
    const relation = fixture.relations.find((candidate) => candidate.id === relationId);
    assert.equal(assumptionPrompt(fixture, relation), expectedPrompt, `${fixture.id}: assumption prompt ${relationId}`);
  }
  if (Number.isFinite(fixture.expected.branchCount)) {
    const branches = new Set(fixture.elements.map((element) => element.branchId).filter(Boolean));
    assert.equal(branches.size, fixture.expected.branchCount, `${fixture.id}: branch count`);
  }
  if (Number.isFinite(fixture.expected.conflictCount)) {
    assert.equal(fixture.relations.filter((relation) => relation.type === "CONFLICT").length, fixture.expected.conflictCount, `${fixture.id}: conflict count`);
  }
}

const permutationFixture = structuredClone(fixtures.find((fixture) => fixture.id === "micro-explicit-and"));
const originalRelation = permutationFixture.relations[0];
const originalVerbalization = verbalizeRelation(permutationFixture, originalRelation);
originalRelation.inputs.reverse();
assert.equal(verbalizeRelation(permutationFixture, originalRelation), originalVerbalization, "Input order must not change semantics");
assert.equal(junctionId(originalRelation), "junction:relation-and", "Junction ID must derive only from relation ID");

for (const fixture of fixtures.filter((candidate) => (candidate.expected.errorCodes || []).length === 0)) {
  const permuted = structuredClone(fixture);
  for (const relation of permuted.relations) relation.inputs.reverse();
  for (const relation of fixture.relations) {
    const candidate = permuted.relations.find((entry) => entry.id === relation.id);
    assert.equal(verbalizeRelation(permuted, candidate), verbalizeRelation(fixture, relation), `${fixture.id}: input permutation`);
  }
}

const forbiddenCycle = structuredClone(fixtures.find((fixture) => fixture.id === "micro-necessity-default-and"));
forbiddenCycle.relations.push({
  id: "relation-cycle",
  type: "NECESSITY",
  combination: "SIMPLE",
  renderMode: "IMPLICIT",
  inputs: [{ elementId: "objective" }],
  outputs: [{ elementId: "condition-a" }]
});
assert(validateFixture(forbiddenCycle).some((entry) => entry.code === "CYCLE_FORBIDDEN"), "Necessity cycle mutation must fail");

const brokenReference = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-crt"));
brokenReference.elements = brokenReference.elements.filter((element) => element.id !== "capacity");
assert(validateFixture(brokenReference).some((entry) => entry.code === "ENDPOINT_MISSING"), "Deleted endpoint mutation must fail");

const duplicateId = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-goal-tree"));
duplicateId.relations[1].id = duplicateId.relations[0].id;
assert(validateFixture(duplicateId).some((entry) => entry.code === "DUPLICATE_OR_MISSING_ID"), "Duplicate ID mutation must fail");

const brokenAssumption = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-crt"));
brokenAssumption.assumptions[1].subject.elementId = "equipment";
assert(validateFixture(brokenAssumption).some((entry) => entry.code === "ASSUMPTION_INPUT_MISSING"), "Assumption leg mutation must fail");

const partialMag = structuredClone(fixtures.find((fixture) => fixture.id === "micro-mag-quantified"));
delete partialMag.relations[0].inputs[0].contribution;
assert(validateFixture(partialMag).some((entry) => entry.code === "MAG_PARTIAL_QUANTIFICATION"), "Partial MAG quantification must fail");

const brokenEc = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
brokenEc.relations = brokenEc.relations.filter((relation) => relation.id !== "rel-d-prime-c");
assert(validateFixture(brokenEc).some((entry) => entry.code === "EC_BRANCH_RELATION_REQUIRED"), "Broken EC topology must fail");

const crossedEcBranch = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
crossedEcBranch.relations.find((relation) => relation.id === "rel-d-b").outputs[0].elementId = "need-cost";
assert(
  validateFixture(crossedEcBranch).some((entry) => entry.code === "EC_BRANCH_RELATION_MISMATCH"),
  "Crossed EC branches must fail"
);

const duplicateEcRole = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
duplicateEcRole.elements.find((element) => element.id === "need-cost").role = "B";
assert(validateFixture(duplicateEcRole).some((entry) => entry.code === "ROLE_CARDINALITY"), "EC role labels must remain unique");

const disconnectedTripartiteEc = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec-tripartite"));
disconnectedTripartiteEc.relations = disconnectedTripartiteEc.relations.filter((relation) => relation.id !== "rel-p1-p3" && relation.id !== "rel-p2-p3");
assert(
  validateFixture(disconnectedTripartiteEc).some((entry) => entry.code === "EC_CONFLICT_GRAPH_DISCONNECTED"),
  "Every branch in a multipartite EC must participate in its conflict graph"
);

const uncoveredEcArrow = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
uncoveredEcArrow.assumptions = uncoveredEcArrow.assumptions.filter((assumption) => assumption.subject.relationId !== "rel-d-b");
assert(
  validateFixture(uncoveredEcArrow).some((entry) => entry.code === "ASSUMPTION_COVERAGE_REQUIRED" && entry.severity === "ERROR"),
  "An accepted EC must cover every arrow with assumptions"
);

const shallowEcArrow = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
const dBAssumptions = shallowEcArrow.assumptions.filter((assumption) => assumption.subject.relationId === "rel-d-b");
shallowEcArrow.assumptions = shallowEcArrow.assumptions.filter(
  (assumption) => assumption.subject.relationId !== "rel-d-b" || assumption.id === dBAssumptions[0].id
);
assert(
  validateFixture(shallowEcArrow).some((entry) => entry.code === "ASSUMPTION_DEPTH_RECOMMENDED" && entry.severity === "WARNING"),
  "EC assumption depth below three must remain visible"
);

const wrongConflictScope = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
wrongConflictScope.assumptions.find((assumption) => assumption.id === "assumption-conflict-1").subject.kind = "RELATION";
assert(
  validateFixture(wrongConflictScope).some((entry) => entry.code === "ASSUMPTION_CONFLICT_SCOPE_REQUIRED"),
  "Conflict assumptions require conflict scope"
);

const invalidAssumptionStatus = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
invalidAssumptionStatus.assumptions[0].status = "DISCARDED";
assert(validateFixture(invalidAssumptionStatus).some((entry) => entry.code === "ASSUMPTION_STATUS_INVALID"), "Unknown assumption lifecycle status must fail");

const wrongLogicMode = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-goal-tree"));
wrongLogicMode.logicMode = "SUFFICIENCY";
assert(validateFixture(wrongLogicMode).some((entry) => entry.code === "LOGIC_MODE_MISMATCH"), "Wrong diagram logic mode must fail");

const badDerivationStatus = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-frt"));
badDerivationStatus.derivations[0].status = "DONE";
assert(validateFixture(badDerivationStatus).some((entry) => entry.code === "DERIVATION_STATUS_INVALID"), "Unknown derivation status must fail");

const badConflictRender = structuredClone(fixtures.find((fixture) => fixture.id === "oracle-ec"));
badConflictRender.relations.find((relation) => relation.type === "CONFLICT").renderMode = "JUNCTION";
assert(validateFixture(badConflictRender).some((entry) => entry.code === "RENDER_MODE_MISMATCH"), "Conflict cannot render as a junctor");

let generatedCaseCount = 0;
for (const [diagramType, logicMode, expectedOperator] of [
  ["SUFFICIENCY_GENERIC", "SUFFICIENCY", "OR"],
  ["NECESSITY_GENERIC", "NECESSITY", "AND"]
]) {
  for (let inputCount = 2; inputCount <= 8; inputCount += 1) {
    const generated = {
      id: `generated-${diagramType}-${inputCount}`,
      diagramType,
      logicMode,
      elements: [
        ...Array.from({ length: inputCount }, (_, index) => ({ id: `input-${index}`, type: "ENTITY", statement: `Input ${index}` })),
        { id: "target", type: "ENTITY", statement: "Target" }
      ],
      relations: Array.from({ length: inputCount }, (_, index) => ({
        id: `relation-${index}`,
        type: logicMode === "SUFFICIENCY" ? "CAUSALITY" : "NECESSITY",
        combination: "SIMPLE",
        renderMode: "IMPLICIT",
        inputs: [{ elementId: `input-${index}` }],
        outputs: [{ elementId: "target" }]
      })),
      assumptions: [],
      derivations: []
    };
    assert.equal(validateFixture(generated).filter((entry) => entry.severity === "ERROR").length, 0, `${generated.id}: valid`);
    assert.equal(targetExpression(generated, "target").split(` ${expectedOperator} `).length, inputCount, `${generated.id}: aggregation`);
    assert(generated.relations.every((relation) => junctionId(relation) === null), `${generated.id}: no redundant junctions`);
    generatedCaseCount += 1;
  }
}

for (const fixture of fixtures.filter((candidate) => candidate.id.startsWith("oracle-"))) {
  for (const relation of fixture.relations.filter((candidate) => candidate.type !== "CONFLICT")) {
    const endpointId = relation.inputs[0]?.elementId;
    if (!endpointId) continue;
    const mutated = structuredClone(fixture);
    mutated.elements = mutated.elements.filter((element) => element.id !== endpointId);
    assert(validateFixture(mutated).some((entry) => entry.code === "ENDPOINT_MISSING"), `${fixture.id}/${relation.id}: endpoint deletion guard`);
    generatedCaseCount += 1;
  }
}

const validCount = fixtures.filter((fixture) => (fixture.expected.errorCodes || []).length === 0).length;
const invalidCount = fixtures.length - validCount;
console.log(`Semantic contract 0.1 passed: ${fixtures.length} fixtures (${validCount} valid, ${invalidCount} invalid) plus ${generatedCaseCount} generated cases; contract self-checks, deterministic verbalization, stable junction IDs, mutation guards and JSON round trips.`);
