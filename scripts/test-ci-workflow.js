const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflow = fs.readFileSync(
  path.join(__dirname, "..", ".github", "workflows", "quality.yml"),
  "utf8"
);
const position = (text) => {
  const index = workflow.indexOf(text);
  assert(index >= 0, `CI workflow is missing: ${text}`);
  return index;
};

assert.match(workflow, /\non:\s*\n\s+push:\s*\n\s+pull_request:/);
assert.match(workflow, /permissions:\s*\n\s+contents: read/);
const architecture = position("  architecture:");
const functional = position("  functional:");
assert(architecture < functional, "Architecture job must be declared before functional tests");
const architectureJob = workflow.slice(architecture, functional);
const functionalJob = workflow.slice(functional);
assert.match(functionalJob, /needs: architecture/, "Functional tests must depend on architecture");
assert.match(architectureJob, /npm run test:architecture/);
assert.match(architectureJob, /npm run test:modules/);
assert.match(functionalJob, /npm run test:prototype -- --no-smoke/);
assert.equal((workflow.match(/npm ci/g) || []).length, 2, "Each isolated CI job must install from the lockfile");

console.log("CI contract passed: read-only triggers, architecture first, module UAT and gated functional tests.");
