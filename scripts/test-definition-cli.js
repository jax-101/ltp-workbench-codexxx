const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const cli = path.join(root, "scripts", "ltp-cli.js");
const officialRoot = path.join(root, "diagram-definitions", "official");
const goalTree = path.join(officialRoot, "goal-tree");
const invoke = (args) => spawnSync(process.execPath, [cli, "definition", ...args, "--json"], {
  cwd: root, encoding: "utf8"
});
const payload = (result) => JSON.parse(result.status === 0 || result.status === 2 ? result.stdout : result.stderr);

const inspection = invoke(["inspect", "--package", goalTree]);
assert.equal(inspection.status, 0, inspection.stderr);
assert.equal(payload(inspection).definition.pin.id, "ltp.goal-tree");

const verification = invoke(["verify", "--package", goalTree]);
assert.equal(verification.status, 0, verification.stderr);
assert.equal(payload(verification).verified, true);

const pin = invoke(["pin", "--package", goalTree]);
assert.equal(pin.status, 0, pin.stderr);
assert.match(payload(pin).pin.hash, /^sha256:[0-9a-f]{64}$/);

const listed = invoke(["list", "--directory", officialRoot]);
assert.equal(listed.status, 0, listed.stderr);
assert.deepEqual(payload(listed).packages.map((item) => item.directoryName), ["crt", "ec", "goal-tree"]);
const missingLibrary = invoke(["list", "--directory", path.join(os.tmpdir(), "ltp-missing-definition-library")]);
assert.equal(missingLibrary.status, 1);
assert.equal(payload(missingLibrary).error.code, "DEFINITION_LIBRARY_UNAVAILABLE");
assert(!payload(missingLibrary).error.message.includes(os.tmpdir()));

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ltp-definition-cli-"));
try {
  const target = path.join(temporaryRoot, "goal-tree-next");
  fs.cpSync(goalTree, target, { recursive: true });
  const definitionPath = path.join(target, "diagram-definition.json");
  const definition = JSON.parse(fs.readFileSync(definitionPath, "utf8"));
  definition.version = "1.1.0";
  definition.description = "Compatible metadata revision";
  fs.writeFileSync(definitionPath, `${JSON.stringify(definition, null, 2)}\n`);

  const preview = invoke(["migration", "preview", "--from-package", goalTree, "--to-package", target]);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(payload(preview).plan.classification, "compatible");

  const applied = invoke(["migration", "apply", "--from-package", goalTree, "--to-package", target]);
  assert.equal(applied.status, 0, applied.stderr);
  const transition = payload(applied).transition;
  assert.equal(transition.pin.version, "1.1.0");
  const receiptPath = path.join(temporaryRoot, "receipt.json");
  const currentPinPath = path.join(temporaryRoot, "current-pin.json");
  fs.writeFileSync(receiptPath, JSON.stringify(transition.receipt));
  fs.writeFileSync(currentPinPath, JSON.stringify(transition.pin));

  const rollback = invoke(["migration", "rollback", "--receipt", receiptPath, "--current-pin", currentPinPath]);
  assert.equal(rollback.status, 0, rollback.stderr);
  assert.equal(payload(rollback).transition.pin.version, "1.0.0");

  const invalidPinPath = path.join(temporaryRoot, "invalid-pin.json");
  fs.writeFileSync(invalidPinPath, "not json");
  const invalid = invoke(["migration", "rollback", "--receipt", receiptPath, "--current-pin", invalidPinPath]);
  assert.equal(invalid.status, 1);
  assert.equal(payload(invalid).error.code, "DEFINITION_CLI_JSON_INVALID");

  const library = path.join(temporaryRoot, "library");
  fs.mkdirSync(library);
  fs.cpSync(goalTree, path.join(library, "valid"), { recursive: true });
  fs.mkdirSync(path.join(library, "invalid"));
  const partialList = invoke(["list", "--directory", library]);
  assert.equal(partialList.status, 2);
  assert.equal(payload(partialList).packages.length, 1);
  assert.equal(payload(partialList).diagnostics[0].directoryName, "invalid");
  assert(!JSON.stringify(payload(partialList).diagnostics).includes(temporaryRoot));
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log("Definition CLI passed: inspect, verify, pin, library list, migration preview/apply/rollback and stable errors.");
