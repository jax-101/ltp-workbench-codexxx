const assert = require("node:assert/strict");
const base = require("../definition-contract/v1/fixtures/minimal-valid.json");
const {
  DefinitionRuntimeError,
  applyDefinitionMigration,
  createDefinitionArtifact,
  createDefinitionMigrationPlan,
  inspectDefinitionPackage,
  rollbackDefinitionMigration,
  validateDefinitionMigrationPlan
} = require("../src/core/definition-runtime");

const packageOf = (definition) => Object.freeze({
  artifact: createDefinitionArtifact(definition),
  fixtures: Object.freeze({}),
  resourceUsage: Object.freeze({ totalBytes: 100 })
});

function compatibleTarget() {
  const target = structuredClone(base);
  target.version = "1.1.0";
  target.elementTypes.push({
    id: "NOTE", label: "Note", shortLabel: "Note", unique: false, synthetic: false, attributes: []
  });
  target.presentation.elementStyles.push({ typeId: "NOTE", shape: "ROUNDED_RECTANGLE", colorToken: "note" });
  return target;
}

function breakingTarget(version = "2.0.0") {
  const target = structuredClone(base);
  target.version = version;
  target.logicMode = "SUFFICIENCY";
  target.defaultInputCombination = "OR";
  target.relationTypes[0].logicModes = ["SUFFICIENCY"];
  return target;
}

const sourcePackage = packageOf(base);
const compatiblePackage = packageOf(compatibleTarget());
const compatiblePlan = createDefinitionMigrationPlan(sourcePackage, compatiblePackage);
assert.equal(compatiblePlan.classification, "compatible");
assert.deepEqual(compatiblePlan.changes.elementTypes.added, ["NOTE"]);
assert.equal(compatiblePlan.requiresBreakingApproval, false);
assert.deepEqual(createDefinitionMigrationPlan(sourcePackage, compatiblePackage), compatiblePlan);
assert(Object.isFrozen(compatiblePlan) && Object.isFrozen(compatiblePlan.changes));
assert.deepEqual(validateDefinitionMigrationPlan(compatiblePlan), compatiblePlan);

const inspection = inspectDefinitionPackage(compatiblePackage);
assert.equal(inspection.pin.version, "1.1.0");
assert(inspection.elementTypes.includes("NOTE"));
assert(Object.isFrozen(inspection));

const applied = applyDefinitionMigration({
  plan: compatiblePlan,
  currentPin: compatiblePlan.sourcePin,
  sourcePackage,
  targetPackage: compatiblePackage
});
assert.deepEqual(applied.pin, compatiblePlan.targetPin);
assert.equal(applied.receipt.classification, "compatible");
assert(Object.isFrozen(applied.receipt));
const rolledBack = rollbackDefinitionMigration({ receipt: applied.receipt, currentPin: applied.pin });
assert.deepEqual(rolledBack.pin, compatiblePlan.sourcePin);

assert.throws(
  () => applyDefinitionMigration({
    plan: compatiblePlan,
    currentPin: { ...compatiblePlan.sourcePin, hash: compatiblePlan.targetPin.hash },
    sourcePackage,
    targetPackage: compatiblePackage
  }),
  (error) => error instanceof DefinitionRuntimeError && error.code === "DEFINITION_MIGRATION_STALE"
);
const tampered = structuredClone(compatiblePlan);
tampered.classification = "none";
assert.throws(
  () => validateDefinitionMigrationPlan(tampered),
  (error) => error.code === "DEFINITION_MIGRATION_INVALID"
);
const changedTarget = packageOf({ ...compatibleTarget(), label: "Changed after preview" });
assert.throws(
  () => applyDefinitionMigration({
    plan: compatiblePlan,
    currentPin: compatiblePlan.sourcePin,
    sourcePackage,
    targetPackage: changedTarget
  }),
  (error) => error.code === "DEFINITION_MIGRATION_INVALID"
);

const breakingPackage = packageOf(breakingTarget());
const breakingPlan = createDefinitionMigrationPlan(sourcePackage, breakingPackage);
assert.equal(breakingPlan.classification, "breaking");
assert(breakingPlan.breakingReasons.includes("changed-semantic-field:logicMode"));
assert.throws(
  () => applyDefinitionMigration({
    plan: breakingPlan,
    currentPin: breakingPlan.sourcePin,
    sourcePackage,
    targetPackage: breakingPackage
  }),
  (error) => error.code === "DEFINITION_MIGRATION_BREAKING_APPROVAL_REQUIRED"
);
assert.deepEqual(applyDefinitionMigration({
  plan: breakingPlan,
  currentPin: breakingPlan.sourcePin,
  sourcePackage,
  targetPackage: breakingPackage,
  allowBreaking: true
}).pin, breakingPlan.targetPin);

assert.throws(
  () => createDefinitionMigrationPlan(sourcePackage, packageOf(breakingTarget("1.1.0"))),
  (error) => error.code === "DEFINITION_MIGRATION_VERSION_INVALID"
);
const differentId = structuredClone(base);
differentId.id = "example.other";
differentId.version = "2.0.0";
assert.throws(
  () => createDefinitionMigrationPlan(sourcePackage, packageOf(differentId)),
  (error) => error.code === "DEFINITION_MIGRATION_ID_MISMATCH"
);

const noOp = createDefinitionMigrationPlan(sourcePackage, sourcePackage);
assert.equal(noOp.classification, "none");
assert.deepEqual(applyDefinitionMigration({
  plan: noOp, currentPin: noOp.sourcePin, sourcePackage, targetPackage: sourcePackage
}).pin, noOp.sourcePin);

const badReceipt = structuredClone(applied.receipt);
badReceipt.toPin.version = "9.0.0";
assert.throws(
  () => rollbackDefinitionMigration({ receipt: badReceipt, currentPin: applied.pin }),
  (error) => error.code === "DEFINITION_MIGRATION_RECEIPT_INVALID"
);

console.log("Definition migrations passed: deterministic compare, semver policy, approval, exact apply and rollback guards.");
