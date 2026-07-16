const path = require("node:path");
const { LtpError } = require("./errors");

const defaultContract = require(path.join(__dirname, "..", "..", "semantic-contract", "v0.1", "contract.json"));

const addIssue = (issues, severity, code, pathValue, message) => {
  issues.push({ severity, code, path: pathValue, message });
};

const relationEndpoints = (relation, key) => Array.isArray(relation[key]) ? relation[key] : [];

const graphHasCycle = (graph) => {
  const adjacency = new Map((graph.elements || []).map((element) => [element.id, []]));
  for (const relation of graph.relations || []) {
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

const countByType = (elements) => {
  const counts = new Map();
  for (const element of elements) counts.set(element.type, (counts.get(element.type) || 0) + 1);
  return counts;
};

const validateSemanticGraph = (graph, contract = defaultContract) => {
  const issues = [];
  const diagramType = graph.diagramType || graph.profile;
  const profile = contract.profiles[diagramType];
  if (!profile) {
    addIssue(issues, "ERROR", "UNKNOWN_DIAGRAM_TYPE", "diagramType", `Unknown diagram type ${diagramType}`);
    return issues;
  }
  if (graph.logicMode !== profile.logicMode) {
    addIssue(issues, "ERROR", "LOGIC_MODE_MISMATCH", "logicMode", `Expected ${profile.logicMode}`);
  }

  const elements = Array.isArray(graph.elements) ? graph.elements : [];
  const relations = Array.isArray(graph.relations) ? graph.relations : [];
  const assumptions = Array.isArray(graph.assumptions) ? graph.assumptions : [];
  const derivations = Array.isArray(graph.derivations) ? graph.derivations : [];
  const ids = new Set();
  for (const item of [...elements, ...relations, ...assumptions, ...derivations]) {
    if (!item.id || ids.has(item.id)) {
      addIssue(issues, "ERROR", "DUPLICATE_OR_MISSING_ID", item.id || "?", "IDs must be present and unique");
    }
    ids.add(item.id);
  }

  const elementById = new Map(elements.map((element) => [element.id, element]));
  const relationById = new Map(relations.map((relation) => [relation.id, relation]));
  const assumptionById = new Map(assumptions.map((assumption) => [assumption.id, assumption]));

  if (graph.reviewState && !contract.reviewStates.includes(graph.reviewState)) {
    addIssue(issues, "ERROR", "REVIEW_STATE_INVALID", "reviewState", `${graph.reviewState} is invalid`);
  }

  const requiredRoles = profile.requiredRoles || {};
  const allowedRoles = new Set(Object.keys(requiredRoles));
  for (const element of elements) {
    if (element.role && !allowedRoles.has(element.role)) {
      addIssue(issues, "ERROR", "ROLE_NOT_ALLOWED", `elements.${element.id}.role`, `${element.role} is not a canonical role`);
    }
  }
  for (const [role, expectedType] of Object.entries(requiredRoles)) {
    const matches = elements.filter((element) => element.role === role);
    if (matches.length !== 1) {
      addIssue(issues, "ERROR", "ROLE_CARDINALITY", `elements.role.${role}`, `Role ${role} must occur exactly once`);
    } else if (matches[0].type !== expectedType) {
      addIssue(issues, "ERROR", "ROLE_TYPE_MISMATCH", `elements.${matches[0].id}.role`, `Role ${role} requires ${expectedType}`);
    }
  }

  for (const element of elements) {
    if (!profile.allowedElementTypes.includes(element.type)) {
      addIssue(issues, "ERROR", "ELEMENT_TYPE_NOT_ALLOWED", `elements.${element.id}.type`, `${element.type} is not allowed`);
    }
    if (!element.statement) addIssue(issues, "ERROR", "STATEMENT_REQUIRED", `elements.${element.id}.statement`, "Statement is required");
  }

  for (const relation of relations) {
    const relationPath = `relations.${relation.id}`;
    const relationType = contract.relationTypes[relation.type];
    const combination = relation.combination === null ? null : contract.combinations[relation.combination];
    const inputs = relationEndpoints(relation, "inputs");
    const outputs = relationEndpoints(relation, "outputs");
    if (!relationType || !profile.allowedRelationTypes.includes(relation.type)) {
      addIssue(issues, "ERROR", "RELATION_TYPE_NOT_ALLOWED", `${relationPath}.type`, `${relation.type} is not allowed`);
      continue;
    }
    if (!relationType.logicModes.includes(graph.logicMode)) {
      addIssue(issues, "ERROR", "RELATION_LOGIC_MISMATCH", `${relationPath}.type`, `${relation.type} does not support ${graph.logicMode}`);
    }
    const relationAllowsNoCombination = relation.combination === null && relationType.combinations?.includes(null);
    if (!relationAllowsNoCombination && (!combination || !profile.allowedCombinations.includes(relation.combination))) {
      addIssue(issues, "ERROR", "COMBINATION_NOT_ALLOWED", `${relationPath}.combination`, `${relation.combination} is not allowed`);
      continue;
    }
    if (relationType.combinations && !relationType.combinations.includes(relation.combination)) {
      addIssue(issues, "ERROR", "COMBINATION_RELATION_MISMATCH", `${relationPath}.combination`, `${relation.combination} is invalid for ${relation.type}`);
    }
    const minInputs = relationType.minInputs ?? combination.minInputs;
    const maxInputs = relationType.maxInputs ?? combination.maxInputs;
    if (inputs.length < minInputs || (maxInputs !== null && inputs.length > maxInputs)) {
      addIssue(issues, "ERROR", "INPUT_ARITY", `${relationPath}.inputs`, `${relation.combination} requires ${minInputs}${maxInputs === null ? "+" : `-${maxInputs}`} input(s)`);
    }
    if (outputs.length < relationType.minOutputs || (relationType.maxOutputs !== null && outputs.length > relationType.maxOutputs)) {
      addIssue(issues, "ERROR", "OUTPUT_ARITY", `${relationPath}.outputs`, `${relation.type} has invalid output arity`);
    }
    const allowedRenderModes = relationType.renderModes || combination.renderModes;
    if (!allowedRenderModes.includes(relation.renderMode)) {
      addIssue(issues, "ERROR", "RENDER_MODE_MISMATCH", `${relationPath}.renderMode`, `${relation.renderMode} is invalid for ${relation.combination}`);
    }
    for (const endpoint of [...inputs, ...outputs]) {
      if (!elementById.has(endpoint.elementId)) {
        addIssue(issues, "ERROR", "ENDPOINT_MISSING", relationPath, `Element ${endpoint.elementId} does not exist`);
      }
    }
    if (relation.combination === "MAG") {
      const quantified = inputs.filter((input) => Number.isFinite(input.contribution));
      if (quantified.length > 0 && quantified.length !== inputs.length) {
        addIssue(issues, "ERROR", "MAG_PARTIAL_QUANTIFICATION", `${relationPath}.inputs`, "MAG contributions must be all quantified or all qualitative");
      }
      if (quantified.some((input) => input.contribution <= 0)) {
        addIssue(issues, "ERROR", "MAG_NON_POSITIVE_CONTRIBUTION", `${relationPath}.inputs`, "MAG contributions must be positive");
      }
      if (quantified.length === 0) {
        addIssue(issues, "WARNING", "MAG_CONTRIBUTION_UNQUANTIFIED", `${relationPath}.inputs`, "MAG is valid but its contribution remains qualitative");
      }
    }
  }

  for (const assumption of assumptions) {
    const assumptionPath = `assumptions.${assumption.id}`;
    const subject = assumption.subject || {};
    const relation = relationById.get(subject.relationId);
    if (!assumption.statement) {
      addIssue(issues, "ERROR", "ASSUMPTION_STATEMENT_REQUIRED", `${assumptionPath}.statement`, "Statement is required");
    }
    if (!contract.assumptionScopes.includes(subject.kind)) {
      addIssue(issues, "ERROR", "ASSUMPTION_SCOPE_INVALID", `${assumptionPath}.subject.kind`, `${subject.kind} is invalid`);
      continue;
    }
    if (!relation) {
      addIssue(issues, "ERROR", "ASSUMPTION_RELATION_MISSING", `${assumptionPath}.subject.relationId`, "Subject relation does not exist");
      continue;
    }
    if (subject.kind === "INPUT" && !relation.inputs.some((input) => input.elementId === subject.elementId)) {
      addIssue(issues, "ERROR", "ASSUMPTION_INPUT_MISSING", `${assumptionPath}.subject.elementId`, "Input is not part of the relation");
    }
    if (subject.kind === "OUTPUT" && !relation.outputs.some((output) => output.elementId === subject.elementId)) {
      addIssue(issues, "ERROR", "ASSUMPTION_OUTPUT_MISSING", `${assumptionPath}.subject.elementId`, "Output is not part of the relation");
    }
    if (subject.kind === "CONFLICT" && relation.type !== "CONFLICT") {
      addIssue(issues, "ERROR", "ASSUMPTION_CONFLICT_MISMATCH", assumptionPath, "Conflict scope requires a conflict relation");
    }
    if (relation.type === "CONFLICT" && profile.assumptionPolicy?.conflictSubjectKind && subject.kind !== profile.assumptionPolicy.conflictSubjectKind) {
      addIssue(issues, "ERROR", "ASSUMPTION_CONFLICT_SCOPE_REQUIRED", assumptionPath, `Conflict assumptions must use ${profile.assumptionPolicy.conflictSubjectKind} scope`);
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
        const severity = graph.reviewState === "ACCEPTED" && profile.assumptionPolicy.acceptedReviewRequiresCoverage ? "ERROR" : "WARNING";
        addIssue(issues, severity, "ASSUMPTION_COVERAGE_REQUIRED", `relations.${relation.id}`, `Relation ${relation.id} needs assumptions behind it`);
      } else if (covered < profile.assumptionPolicy.recommendedPerRelation) {
        addIssue(issues, "WARNING", "ASSUMPTION_DEPTH_RECOMMENDED", `relations.${relation.id}`, `Relation ${relation.id} should expose at least ${profile.assumptionPolicy.recommendedPerRelation} assumptions`);
      }
    }
  }

  for (const derivation of derivations) {
    const derivationPath = `derivations.${derivation.id}`;
    if (!contract.derivationTypes.includes(derivation.type)) {
      addIssue(issues, "ERROR", "DERIVATION_TYPE_INVALID", `${derivationPath}.type`, `${derivation.type} is invalid`);
    }
    if (!contract.derivationStatuses.includes(derivation.status)) {
      addIssue(issues, "ERROR", "DERIVATION_STATUS_INVALID", `${derivationPath}.status`, `${derivation.status} is invalid`);
    }
    if (!elementById.has(derivation.sourceElementId)) {
      addIssue(issues, "ERROR", "DERIVATION_SOURCE_MISSING", `${derivationPath}.sourceElementId`, "Source element does not exist");
    }
    if (derivation.targetAssumptionId && !assumptionById.has(derivation.targetAssumptionId)) {
      addIssue(issues, "ERROR", "DERIVATION_TARGET_MISSING", `${derivationPath}.targetAssumptionId`, "Target assumption does not exist");
    }
    if (derivation.targetElementId && !elementById.has(derivation.targetElementId)) {
      addIssue(issues, "ERROR", "DERIVATION_TARGET_MISSING", `${derivationPath}.targetElementId`, "Target element does not exist");
    }
  }

  const counts = countByType(elements);
  for (const [type, range] of Object.entries(profile.requiredElementCounts || {})) {
    const count = counts.get(type) || 0;
    if (count < range.min || (range.max !== null && count > range.max)) {
      addIssue(issues, "ERROR", "ELEMENT_COUNT", `elements.${type}`, `${type} count ${count} is outside required range`);
    }
  }
  for (const [type, range] of Object.entries(profile.recommendedElementCounts || {})) {
    const count = counts.get(type) || 0;
    if (count < range.min || (range.max !== null && count > range.max)) {
      addIssue(issues, "WARNING", "ELEMENT_COUNT_RECOMMENDED", `elements.${type}`, `${type} count ${count} is outside recommended range`);
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
    if (count < pattern.min) {
      addIssue(issues, "ERROR", "RELATION_PATTERN_REQUIRED", `relations.${pattern.id}`, `${pattern.id} requires ${pattern.min} relation(s)`);
    }
  }

  if (profile.cyclePolicy === "FORBIDDEN" && graphHasCycle(graph)) {
    addIssue(issues, "ERROR", "CYCLE_FORBIDDEN", "relations", `${diagramType} cannot contain a directed cycle`);
  }
  return issues;
};

const assertSemanticGraph = (graph, contract = defaultContract) => {
  const issues = validateSemanticGraph(graph, contract);
  const errors = issues.filter((entry) => entry.severity === "ERROR");
  if (errors.length) {
    throw new LtpError("SEMANTIC_GRAPH_INVALID", `Semantic graph validation failed with ${errors.length} error(s)`, { issues });
  }
  return { graph, issues };
};

module.exports = { assertSemanticGraph, defaultContract, graphHasCycle, validateSemanticGraph };
