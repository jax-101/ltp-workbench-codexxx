const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const modulesDirectory = path.join(root, "architecture", "modules");
const charters = fs.readdirSync(modulesDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(fs.readFileSync(path.join(modulesDirectory, file), "utf8")))
  .filter((charter) => charter.acceptance.status !== "planned")
  .sort((left, right) => left.id.localeCompare(right.id));

for (const charter of charters) {
  const scriptPath = charter.acceptance.command.slice("node ".length);
  const result = spawnSync(process.execPath, [path.join(root, scriptPath)], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`Module acceptance failed: ${charter.id}`);
    process.exit(result.status || 1);
  }
}

console.log(`Module acceptance passed: ${charters.length} independently executed module suites.`);
