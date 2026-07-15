const fs = require("node:fs");
const path = require("node:path");
const { validateWorkspace } = require("../src/core/workspace-validator");

const filePath = path.join(__dirname, "..", "outputs", "sample-workspace-v0.1.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
const issues = validateWorkspace(data);

if (issues.length) {
  console.error(issues.map((issue) => `${issue.code} ${issue.path}: ${issue.message}`).join("\n"));
  process.exit(1);
}

console.log(
  `Model fixture OK: ${data.systems.length} system(s), ${data.canvases[0].frames.length} frame(s), ${data.trees[0].nodes.length} node(s), ${data.trees[0].links.length} link(s).`
);
