const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const modulesDirectory = path.join(root, "architecture", "modules");
const inventory = require("../architecture/interaction-inventory.json");
const envelope = require("../architecture/contracts/result-envelope.v1.json");
const normalize = (value) => value.split(path.sep).join("/");

const moduleFiles = fs.readdirSync(modulesDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => path.join(modulesDirectory, file));
const charters = moduleFiles.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const expectedModuleIds = new Set(inventory.modules.map((item) => item.id));
const actualModuleIds = new Set(charters.map((item) => item.id));
assert.deepEqual([...actualModuleIds].sort(), [...expectedModuleIds].sort(), "Module charter catalog is incomplete");

const contractIds = new Set([envelope.id]);
for (const charter of charters) {
  assert.equal(charter.schemaVersion, 1, `Unsupported charter ${charter.id}`);
  assert(["implemented", "transitional", "planned"].includes(charter.status), `Invalid status for ${charter.id}`);
  for (const field of ["purpose", "owns", "doesNotOwn", "invariants", "allowedDependencies", "forbiddenDependencies", "contracts"]) {
    assert(charter[field] && (!Array.isArray(charter[field]) || charter[field].length > 0 || field === "allowedDependencies"),
      `${charter.id} is missing ${field}`);
  }
  const overlap = charter.allowedDependencies.filter((dependency) => charter.forbiddenDependencies.includes(dependency));
  assert.deepEqual(overlap, [], `${charter.id} allows and forbids the same dependency`);
  for (const dependency of [...charter.allowedDependencies, ...charter.forbiddenDependencies]) {
    assert(expectedModuleIds.has(dependency), `${charter.id} references unknown dependency ${dependency}`);
  }
  for (const contract of charter.contracts) {
    assert(!contractIds.has(contract.id), `Duplicate contract ID ${contract.id}`);
    assert.equal(contract.version, 1, `Unsupported contract version ${contract.id}`);
    assert(["implemented", "provisional", "target", "planned"].includes(contract.status), `Invalid contract status ${contract.id}`);
    for (const field of ["operations", "inputs", "outputs", "errors"]) {
      assert(Array.isArray(contract[field]) && contract[field].length > 0, `${contract.id} is missing ${field}`);
    }
    contractIds.add(contract.id);
  }
  if (charter.status === "planned") {
    assert.equal(charter.acceptance.status, "planned", `${charter.id} has premature acceptance status`);
    assert.equal(charter.acceptance.command, null, `${charter.id} has a premature acceptance command`);
  } else {
    assert(charter.acceptance.command?.startsWith("node scripts/module-acceptance/"),
      `${charter.id} has no black-box acceptance command`);
    const scriptPath = charter.acceptance.command.slice("node ".length);
    assert(fs.existsSync(path.join(root, scriptPath)), `${charter.id} acceptance script is missing`);
  }
}

for (const interaction of inventory.interactions) {
  assert(interaction.targetContract, `${interaction.id} has no target contract`);
  assert(contractIds.has(interaction.targetContract), `${interaction.id} references missing ${interaction.targetContract}`);
}

assert.equal(envelope.version, 1);
assert.equal(envelope.owner, "architecture-protocol");
assert(envelope.invariants.some((item) => item.includes("Consumers branch on code")));

console.log(
  `Module contracts passed: ${charters.length} charters, ${contractIds.size} versioned contracts, ` +
  `${inventory.interactions.length} mapped interactions and ${normalize(path.relative(root, modulesDirectory))}.`
);
