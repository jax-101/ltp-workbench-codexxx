const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { root } = require("./helpers");

const cli = path.join(root, "scripts", "ltp-cli.js");
const fixture = path.join(root, "outputs", "sample-workspace-v0.1.json");
const invoke = (args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });

const valid = invoke(["validate", "--workspace", fixture, "--json"]);
assert.equal(valid.status, 0, valid.stderr);
const validPayload = JSON.parse(valid.stdout);
assert.equal(validPayload.ok, true);
assert.equal(validPayload.issues.length, 0);

const documents = invoke(["tree", "list", "--workspace", fixture, "--json"]);
assert.equal(documents.status, 0, documents.stderr);
assert(JSON.parse(documents.stdout).trees.length > 0);

const invalid = invoke(["validate", "--json"]);
assert.equal(invalid.status, 1);
const invalidPayload = JSON.parse(invalid.stderr);
assert.equal(invalidPayload.ok, false);
assert.equal(invalidPayload.error.code, "ARGUMENT_REQUIRED");

const definition = invoke([
  "definition", "inspect", "--package", path.join(root, "diagram-definitions", "official", "ec"), "--json"
]);
assert.equal(definition.status, 0, definition.stderr);
assert.equal(JSON.parse(definition.stdout).definition.semanticDiagramType, "EC");

console.log("Adapters acceptance passed: workspace and definition CLI boundaries, JSON success and stable errors.");
