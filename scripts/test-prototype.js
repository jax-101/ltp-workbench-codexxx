const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = path.join(__dirname, "..");
const args = new Set(process.argv.slice(2));

const steps = [
  {
    name: "Enforce strict modular architecture",
    command: "npm",
    args: ["run", "test:architecture"]
  },
  {
    name: "Validate data model",
    command: "npm",
    args: ["run", "validate:model"]
  },
  {
    name: "Test semantic contract",
    command: "npm",
    args: ["run", "test:semantic"]
  },
  {
    name: "Test additive semantic migration",
    command: "npm",
    args: ["run", "test:semantic-migration"]
  },
  {
    name: "Test native CRT vertical",
    command: "npm",
    args: ["run", "test:crt"]
  },
  {
    name: "Test native EC vertical",
    command: "npm",
    args: ["run", "test:ec"]
  },
  {
    name: "Test transactional core",
    command: "npm",
    args: ["run", "test:core"]
  },
  {
    name: "Test workspace sessions and document views",
    command: "npm",
    args: ["run", "test:workspace-manager"]
  },
  {
    name: "Test composed layout",
    command: "npm",
    args: ["run", "test:layout"]
  },
  {
    name: "Test deterministic randomized layouts",
    command: "npm",
    args: ["run", "test:layout-random"]
  },
  {
    name: "Check main process syntax",
    command: process.execPath,
    args: ["--check", "src/main.js"]
  },
  {
    name: "Check renderer syntax",
    command: process.execPath,
    args: ["--check", "src/renderer/app.js"]
  }
];

if (!args.has("--no-smoke")) {
  steps.push({
    name: "Run Electron smoke test",
    command: "npm",
    args: ["run", "smoke"]
  });
}

if (args.has("--package")) {
  steps.push({
    name: "Package standalone app",
    command: "npm",
    args: ["run", "package"]
  });
}

const run = ({ name, command, args }) => {
  console.log(`\n==> ${name}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      LTP_USE_SAMPLE: "1"
    },
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    console.error(`\nFAILED: ${name}`);
    process.exit(result.status || 1);
  }
};

for (const step of steps) {
  run(step);
}

if (!args.has("--no-smoke")) {
  const exportPath = path.join(rootDir, "outputs", "prototype-goal-tree-export.md");
  if (!fs.existsSync(exportPath)) {
    console.error(`\nFAILED: export was not generated at ${exportPath}`);
    process.exit(1);
  }

  const exportText = fs.readFileSync(exportPath, "utf8");
  if (!exportText.includes("# Goal Tree - LTP Workbench") || !exportText.includes("Assumptions:")) {
    console.error("\nFAILED: export Markdown does not contain expected Goal Tree content");
    process.exit(1);
  }
}

console.log("\nPrototype test suite passed.");
console.log("Useful options:");
console.log("  npm run test:prototype -- --no-smoke");
console.log("  npm run test:prototype -- --package");
