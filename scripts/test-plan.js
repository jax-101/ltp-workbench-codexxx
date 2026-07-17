const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadRegister, loadEffortLog, loadUnknowns, summarize } = require("./scope-status");
const { loadRoadmap, validateRoadmap, currentPlan } = require("./plan-status");

const root = path.join(__dirname, "..");
const register = loadRegister();
const roadmap = loadRoadmap();
const effort = loadEffortLog();
const unknowns = loadUnknowns();
const expected = currentPlan();
const actual = fs.readFileSync(path.join(root, "outputs", "Plan-Status.md"), "utf8");

validateRoadmap(roadmap, register);
assert.equal(actual, expected, "Plan-Status.md is stale; run npm run plan:write");

const duplicate = structuredClone(roadmap);
duplicate.stages[1].packageIds.push(duplicate.stages[0].packageIds[0]);
assert.throws(() => validateRoadmap(duplicate, register), /multiple roadmap stages/);

const omission = structuredClone(roadmap);
omission.stages[0].packageIds = ["P01"];
assert.throws(() => validateRoadmap(omission, register), /multiple roadmap stages|omits packages/);

const completedActive = structuredClone(roadmap);
completedActive.activePackageId = register.packages.find((item) => item.status === "done").id;
assert.throws(() => validateRoadmap(completedActive, register), /active package/);

const brokenEvidence = structuredClone(effort);
brokenEvidence.estimateRevisions[0].evidenceEvents = ["E9999"];
assert.throws(() => summarize(register, brokenEvidence, unknowns), /revision evidence/);

const brokenUnknown = structuredClone(unknowns);
brokenUnknown.unknowns.find((item) => item.resultingPackages.length).resultingPackages.pop();
assert.throws(() => summarize(register, effort, brokenUnknown), /not bidirectional/);

console.log(
  `Plan gate passed: ${roadmap.stages.length} stages, ${register.packages.length} packages, ` +
  `active ${roadmap.activePackageId} and an exact generated Markdown projection.`
);
