const fs = require("node:fs/promises");
const path = require("node:path");
const {
  applyDefinitionMigration,
  compileDefinition,
  createDefinitionMigrationPlan,
  inspectDefinitionPackage,
  loadDefinition,
  rollbackDefinitionMigration
} = require("../src/core/definition-runtime/index.js");

const supportedCapabilities = ["semantic.graph.v1"];

function required(flags, name) {
  if (!flags[name] || flags[name] === true) {
    const error = new Error(`--${name} is required`);
    error.code = "ARGUMENT_REQUIRED";
    throw error;
  }
  return flags[name];
}

async function readJson(filePath, resource) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    const failure = new Error(`${resource} must be readable JSON`);
    failure.code = "DEFINITION_CLI_JSON_INVALID";
    throw failure;
  }
}

const loadPackage = (packagePath) => loadDefinition(
  { kind: "directory", rootPath: packagePath },
  { supportedCapabilities }
);

async function inspect(flags) {
  const summary = inspectDefinitionPackage(await loadPackage(required(flags, "package")));
  return { payload: { ok: true, definition: summary }, humanText: `${summary.pin.id}@${summary.pin.version} verified` };
}

async function verify(flags) {
  const definitionPackage = await loadPackage(required(flags, "package"));
  const compiled = compileDefinition(definitionPackage);
  return {
    payload: {
      ok: true,
      verified: true,
      pin: compiled.pin,
      runtimeId: compiled.runtimeId,
      semanticDiagramType: compiled.semanticDiagramType,
      fixtureCount: Object.keys(compiled.fixtures).length
    },
    humanText: `${compiled.pin.id}@${compiled.pin.version} package is valid and compilable`
  };
}

async function list(flags) {
  const directory = required(flags, "directory");
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    const failure = new Error("Definition library is unavailable");
    failure.code = "DEFINITION_LIBRARY_UNAVAILABLE";
    throw failure;
  }
  const packages = [];
  const diagnostics = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    try {
      const summary = inspectDefinitionPackage(await loadPackage(path.join(directory, entry.name)));
      packages.push({ directoryName: entry.name, ...summary });
    } catch (error) {
      diagnostics.push({ directoryName: entry.name, code: error.code || "DEFINITION_LOAD_FAILED", message: error.message });
    }
  }
  return {
    payload: { ok: diagnostics.length === 0, packages, diagnostics },
    humanText: `${packages.length} valid definition package(s); ${diagnostics.length} rejected`,
    exitCode: diagnostics.length ? 2 : 0
  };
}

async function packagesAndPlan(flags) {
  const sourcePackage = await loadPackage(required(flags, "from-package"));
  const targetPackage = await loadPackage(required(flags, "to-package"));
  return { sourcePackage, targetPackage, plan: createDefinitionMigrationPlan(sourcePackage, targetPackage) };
}

async function preview(flags) {
  const { plan } = await packagesAndPlan(flags);
  return {
    payload: { ok: true, plan },
    humanText: `${plan.classification} migration ${plan.sourcePin.version} -> ${plan.targetPin.version}`
  };
}

async function apply(flags) {
  const { sourcePackage, targetPackage, plan } = await packagesAndPlan(flags);
  const currentPin = flags["current-pin"] && flags["current-pin"] !== true
    ? await readJson(flags["current-pin"], "Current pin")
    : plan.sourcePin;
  const transition = applyDefinitionMigration({
    plan,
    currentPin,
    sourcePackage,
    targetPackage,
    allowBreaking: flags["allow-breaking"] === true
  });
  return {
    payload: { ok: true, transition },
    humanText: `Definition pin advanced to ${transition.pin.version}`
  };
}

async function rollback(flags) {
  const receipt = await readJson(required(flags, "receipt"), "Migration receipt");
  const currentPin = await readJson(required(flags, "current-pin"), "Current pin");
  const transition = rollbackDefinitionMigration({ receipt, currentPin });
  return {
    payload: { ok: true, transition },
    humanText: `Definition pin restored to ${transition.pin.version}`
  };
}

async function runDefinitionCommand(positionals, flags) {
  const [action, subaction] = positionals;
  if (action === "inspect") return inspect(flags);
  if (action === "verify") return verify(flags);
  if (action === "pin") {
    const result = await inspect(flags);
    return { payload: { ok: true, pin: result.payload.definition.pin }, humanText: result.humanText };
  }
  if (action === "list") return list(flags);
  if (action === "compare") return preview(flags);
  if (action === "migration" && subaction === "preview") return preview(flags);
  if (action === "migration" && subaction === "apply") return apply(flags);
  if (action === "migration" && subaction === "rollback") return rollback(flags);
  const error = new Error(
    "Unknown definition command. Use inspect, verify, pin, list, compare, or migration preview/apply/rollback."
  );
  error.code = "COMMAND_UNKNOWN";
  throw error;
}

module.exports = { runDefinitionCommand };
