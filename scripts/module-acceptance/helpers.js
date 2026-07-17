const fs = require("node:fs");
const path = require("node:path");
const { migrateWorkspace } = require("../../src/core/workspace-migrations");

const root = path.join(__dirname, "..", "..");

function loadFixture(name = "sample-workspace-v0.1.json") {
  return JSON.parse(fs.readFileSync(path.join(root, "outputs", name), "utf8"));
}

function loadMigratedFixture(name) {
  return migrateWorkspace(loadFixture(name)).workspace;
}

async function expectCode(operation, code) {
  try {
    await operation();
  } catch (error) {
    if (error.code === code) return error;
    throw error;
  }
  throw new Error(`Expected ${code}`);
}

module.exports = { expectCode, loadFixture, loadMigratedFixture, root };
