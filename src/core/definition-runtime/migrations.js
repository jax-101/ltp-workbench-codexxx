const { createHash } = require("node:crypto");
const { canonicalSerialize } = require("./canonical");
const { DefinitionRuntimeError } = require("./errors");
const { createDefinitionPin, validatePin } = require("./pins");

const CONTRACT_VERSION = 1;
const PIN_FIELDS = ["formatVersion", "hash", "id", "version"];

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function fail(code, message, details = {}) {
  throw new DefinitionRuntimeError(code, message, details);
}

const digest = (value) => `sha256:${createHash("sha256").update(canonicalSerialize(value)).digest("hex")}`;
const same = (left, right) => canonicalSerialize(left) === canonicalSerialize(right);
const definitionOf = (definitionPackage) => definitionPackage?.artifact?.definition;

function semver(version) {
  return version.split(".").map(Number);
}

function compareVersions(left, right) {
  const leftParts = semver(left);
  const rightParts = semver(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function setChanges(source = [], target = []) {
  const before = new Set(source);
  const after = new Set(target);
  return {
    added: target.filter((item) => !before.has(item)).sort(),
    removed: source.filter((item) => !after.has(item)).sort()
  };
}

function collectionChanges(source, target) {
  const before = new Map(source.map((item) => [item.id, item]));
  const after = new Map(target.map((item) => [item.id, item]));
  return {
    added: [...after.keys()].filter((id) => !before.has(id)).sort(),
    removed: [...before.keys()].filter((id) => !after.has(id)).sort(),
    changed: [...before.keys()].filter((id) => after.has(id) && !same(before.get(id), after.get(id))).sort()
  };
}

function compareDefinitions(sourcePackage, targetPackage) {
  const sourcePin = createDefinitionPin(sourcePackage);
  const targetPin = createDefinitionPin(targetPackage);
  const source = definitionOf(sourcePackage);
  const target = definitionOf(targetPackage);
  if (sourcePin.id !== targetPin.id) {
    fail("DEFINITION_MIGRATION_ID_MISMATCH", "Definition migration requires the same definition ID", {
      sourceId: sourcePin.id, targetId: targetPin.id
    });
  }

  const capabilities = setChanges(source.requiredKernelCapabilities, target.requiredKernelCapabilities);
  const elementTypes = collectionChanges(source.elementTypes, target.elementTypes);
  const relationTypes = collectionChanges(source.relationTypes, target.relationTypes);
  const semanticFields = ["logicMode", "defaultInputCombination", "cyclePolicy", "defaultElementType", "topology"]
    .filter((field) => !same(source[field], target[field]));
  const changes = { capabilities, elementTypes, relationTypes, semanticFields };
  const breakingReasons = [
    ...capabilities.added.map((id) => `required-capability:${id}`),
    ...elementTypes.removed.map((id) => `removed-element-type:${id}`),
    ...elementTypes.changed.map((id) => `changed-element-type:${id}`),
    ...relationTypes.removed.map((id) => `removed-relation-type:${id}`),
    ...relationTypes.changed.map((id) => `changed-relation-type:${id}`),
    ...semanticFields.map((field) => `changed-semantic-field:${field}`)
  ];
  const classification = sourcePin.hash === targetPin.hash
    ? "none"
    : breakingReasons.length ? "breaking" : "compatible";

  if (classification !== "none" && compareVersions(targetPin.version, sourcePin.version) <= 0) {
    fail("DEFINITION_MIGRATION_VERSION_INVALID", "Changed definition content requires a higher target version", {
      sourceVersion: sourcePin.version, targetVersion: targetPin.version
    });
  }
  if (classification === "breaking" && semver(targetPin.version)[0] <= semver(sourcePin.version)[0]) {
    fail("DEFINITION_MIGRATION_VERSION_INVALID", "Breaking definition changes require a higher major version", {
      sourceVersion: sourcePin.version, targetVersion: targetPin.version, breakingReasons
    });
  }
  return deepFreeze({ sourcePin, targetPin, classification, breakingReasons, changes });
}

function createDefinitionMigrationPlan(sourcePackage, targetPackage) {
  const comparison = compareDefinitions(sourcePackage, targetPackage);
  const body = {
    contractVersion: CONTRACT_VERSION,
    definitionId: comparison.sourcePin.id,
    sourcePin: comparison.sourcePin,
    targetPin: comparison.targetPin,
    classification: comparison.classification,
    breakingReasons: comparison.breakingReasons,
    changes: comparison.changes,
    requiresBreakingApproval: comparison.classification === "breaking"
  };
  return deepFreeze({ migrationId: digest(body), ...body });
}

function validatePlan(plan) {
  const keys = plan && typeof plan === "object" && !Array.isArray(plan) ? Object.keys(plan).sort() : [];
  const expected = ["breakingReasons", "changes", "classification", "contractVersion", "definitionId", "migrationId",
    "requiresBreakingApproval", "sourcePin", "targetPin"].sort();
  if (!same(keys, expected) || plan.contractVersion !== CONTRACT_VERSION ||
      !["none", "compatible", "breaking"].includes(plan.classification)) {
    fail("DEFINITION_MIGRATION_INVALID", "Definition migration plan is malformed");
  }
  const sourcePin = validatePin(plan.sourcePin);
  const targetPin = validatePin(plan.targetPin);
  const { migrationId, ...body } = plan;
  if (sourcePin.id !== targetPin.id || plan.definitionId !== sourcePin.id || digest(body) !== migrationId ||
      plan.requiresBreakingApproval !== (plan.classification === "breaking")) {
    fail("DEFINITION_MIGRATION_INVALID", "Definition migration plan identity is invalid");
  }
  return deepFreeze(structuredClone(plan));
}

function samePin(left, right) {
  return PIN_FIELDS.every((field) => left[field] === right[field]);
}

function applyDefinitionMigration(request = {}) {
  const plan = validatePlan(request.plan);
  const currentPin = validatePin(request.currentPin);
  const expectedPlan = createDefinitionMigrationPlan(request.sourcePackage, request.targetPackage);
  if (!same(plan, expectedPlan)) fail("DEFINITION_MIGRATION_INVALID", "Migration plan does not match its packages");
  if (!samePin(currentPin, plan.sourcePin)) {
    fail("DEFINITION_MIGRATION_STALE", "Current definition pin does not match the migration source");
  }
  if (plan.requiresBreakingApproval && request.allowBreaking !== true) {
    fail("DEFINITION_MIGRATION_BREAKING_APPROVAL_REQUIRED", "Breaking definition migration requires explicit approval", {
      breakingReasons: plan.breakingReasons
    });
  }
  const receiptBody = {
    contractVersion: CONTRACT_VERSION,
    migrationId: plan.migrationId,
    definitionId: plan.definitionId,
    fromPin: plan.sourcePin,
    toPin: plan.targetPin,
    classification: plan.classification
  };
  const receipt = deepFreeze({ receiptId: digest(receiptBody), ...receiptBody });
  return deepFreeze({ pin: plan.targetPin, receipt });
}

function rollbackDefinitionMigration(request = {}) {
  const receipt = request.receipt;
  const keys = receipt && typeof receipt === "object" && !Array.isArray(receipt) ? Object.keys(receipt).sort() : [];
  const expected = ["classification", "contractVersion", "definitionId", "fromPin", "migrationId", "receiptId", "toPin"].sort();
  if (!same(keys, expected) || receipt.contractVersion !== CONTRACT_VERSION) {
    fail("DEFINITION_MIGRATION_RECEIPT_INVALID", "Definition migration receipt is malformed");
  }
  const { receiptId, ...body } = receipt;
  const fromPin = validatePin(receipt.fromPin);
  const toPin = validatePin(receipt.toPin);
  if (digest(body) !== receiptId || fromPin.id !== toPin.id || receipt.definitionId !== fromPin.id) {
    fail("DEFINITION_MIGRATION_RECEIPT_INVALID", "Definition migration receipt identity is invalid");
  }
  const currentPin = validatePin(request.currentPin);
  if (!samePin(currentPin, toPin)) {
    fail("DEFINITION_MIGRATION_STALE", "Current definition pin does not match the applied migration");
  }
  return deepFreeze({ pin: fromPin, rolledBackMigrationId: receipt.migrationId, receiptId });
}

module.exports = {
  applyDefinitionMigration,
  compareDefinitions,
  createDefinitionMigrationPlan,
  rollbackDefinitionMigration,
  validatePlan
};
