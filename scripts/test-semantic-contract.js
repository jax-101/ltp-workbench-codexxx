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
      const inputMatches = relation.inputs.some((input) => elementById.get(input.elementId)?.type === pattern.inputType);
      const outputMatches = pattern.outputType === null || relation.outputs.some((output) => elementById.get(output.elementId)?.type === pattern.outputType);
      return inputMatches && outputMatches;
    }).length;
    if (count < pattern.min) issue(issues, "ERROR", "RELATION_PATTERN_REQUIRED", `relations.${pattern.id}`, `${pattern.id} requires ${pattern.min} relation(s)`);
  }

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
brokenEc.relations = brokenEc.relations.filter((relation) => relation.id !== "rel-want-large-cost");
assert(validateFixture(brokenEc).some((entry) => entry.code === "RELATION_PATTERN_REQUIRED"), "Broken EC topology must fail");

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
