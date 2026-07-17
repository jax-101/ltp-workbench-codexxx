const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const lineCount = (relativePath) => read(relativePath).split(/\r?\n/).length - 1;

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolutePath = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
});

const relative = (absolutePath) => path.relative(root, absolutePath).split(path.sep).join("/");
const productionFiles = walk(path.join(root, "src"))
  .map(relative)
  .filter((file) => /\.(js|css|html)$/.test(file));

const legacyBudgets = Object.freeze({
  "src/renderer/app.js": 6494,
  "src/renderer/styles.css": 1433,
  "src/core/composed-layout.js": 1375,
  "src/core/command-registry.js": 677,
  "src/main.js": 585,
  "src/core/semantic-validator.js": 362,
  "src/core/random-layout-fixture.js": 302
});

for (const file of productionFiles) {
  const budget = legacyBudgets[file] || 300;
  assert(
    lineCount(file) <= budget,
    `${file} has ${lineCount(file)} lines; architecture budget is ${budget}`
  );
}

for (const file of productionFiles.filter((candidate) => candidate.startsWith("src/core/") && candidate.endsWith(".js"))) {
  const source = read(file);
  for (const forbidden of [/require\(["']electron["']\)/, /require\(["'][^"']*renderer[^"']*["']\)/]) {
    assert(!forbidden.test(source), `${file} crosses the headless-core boundary through ${forbidden}`);
  }
}

const layoutEngineSource = read("src/core/layout-engines/elk-layered-engine.js");
for (const forbidden of ["workspace", "diagram-registry", "semantic-", "renderer", "electron"]) {
  assert(!layoutEngineSource.includes(forbidden), `ELK adapter depends on forbidden concept ${forbidden}`);
}

const context = read("CONTEXT.md");
for (const heading of ["## Architecture", "## Technologies", "## Engineering Rules", "## Current Status", "## Verification"]) {
  assert(context.includes(heading), `CONTEXT.md is missing ${heading}`);
}

const packageMetadata = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
assert(context.includes(packageMetadata.ltpBuild.id), "CONTEXT.md build identity is stale");
for (const dependency of ["electron", "electron-builder", "elkjs", "immer", "proper-lockfile"]) {
  const version = lock.packages[`node_modules/${dependency}`]?.version;
  assert(
    version && context.toLowerCase().includes(`${dependency}: \`${version}\``),
    `CONTEXT.md is missing ${dependency} ${version}`
  );
}

const architecture = read("ARCHITECTURE.md");
for (const section of ["## Target Modules", "## Dependency Rules", "## Module Test Contract", "## Iteration Policy"]) {
  assert(architecture.includes(section), `ARCHITECTURE.md is missing ${section}`);
}

const agentInstructions = read("AGENTS.md");
assert(agentInstructions.includes("CONTEXT.md"), "AGENTS.md must direct agents to CONTEXT.md");
assert(agentInstructions.includes("ARCHITECTURE.md"), "AGENTS.md must direct agents to ARCHITECTURE.md");

console.log(
  `Architecture gate passed: ${productionFiles.length} production files, ` +
  `${Object.keys(legacyBudgets).length} legacy no-growth budgets, headless core and context are valid.`
);
