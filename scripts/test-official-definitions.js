const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const semanticContract = require("../semantic-contract/v0.1/contract.json");
const { createDefinitionArtifact, compileDefinition, loadDefinition } = require("../src/core/definition-runtime");
const { validateSemanticGraph } = require("../src/core/semantic-validator");

const root = path.join(__dirname, "..");
const supportedCapabilities = ["semantic.graph.v1"];
const packages = Object.freeze({
  "goal-tree": { runtimeId: "goalTree", semanticType: "GOAL_TREE", fixtures: ["goal-tree.json"] },
  crt: { runtimeId: "crt", semanticType: "CRT", fixtures: ["crt.json"] },
  ec: { runtimeId: "ec", semanticType: "EC", fixtures: ["ec.json", "ec-tripartite.json"] }
});

const legacyRegistry = Object.freeze({
  goalTree: {
    id: "goalTree", label: "Goal Tree", defaultDirection: "TB", layering: "distanceToSink",
    cycleBreaking: { strategy: "greedyFeedbackArc", restoreSemanticEdges: true },
    directions: ["TB", "BT", "LR", "RL"], defaultRoutingStyle: "CURVED",
    routingStyles: [{ id: "CURVED", label: "Curved" }, { id: "ORTHOGONAL", label: "Orthogonal" }],
    defaultNodeType: "necessaryCondition",
    nodeTypes: [
      { id: "goal", label: "Goal", shortLabel: "Goal", unique: true },
      { id: "criticalSuccessFactor", label: "Critical Success Factor", shortLabel: "CSF" },
      { id: "necessaryCondition", label: "Necessary Condition", shortLabel: "NC" },
      { id: "assumption", label: "Assumption", shortLabel: "Assumption" }
    ]
  },
  crt: {
    id: "crt", label: "Current Reality Tree", defaultDirection: "BT", layering: "distanceToSink",
    cycleBreaking: { strategy: "greedyFeedbackArc", restoreSemanticEdges: true },
    directions: ["BT", "TB", "LR", "RL"], defaultRoutingStyle: "CURVED",
    routingStyles: [{ id: "CURVED", label: "Curved" }, { id: "ORTHOGONAL", label: "Orthogonal" }],
    defaultNodeType: "entity",
    nodeTypes: [
      { id: "entity", label: "Entity", shortLabel: "Entity" },
      { id: "ude", label: "Undesirable Effect", shortLabel: "UDE" },
      { id: "rootCause", label: "Root Cause", shortLabel: "RC" },
      { id: "criticalRootCause", label: "Critical Root Cause", shortLabel: "CRC" },
      { id: "junction", label: "Junction", shortLabel: "J", synthetic: true }
    ]
  },
  ec: {
    id: "ec", label: "Evaporating Cloud", defaultDirection: "RL", layering: "canonicalRoles",
    cycleBreaking: { strategy: "forbidden", restoreSemanticEdges: true },
    directions: ["RL", "LR"], defaultRoutingStyle: "CURVED",
    routingStyles: [{ id: "CURVED", label: "Curved" }, { id: "ORTHOGONAL", label: "Orthogonal" }],
    defaultNodeType: "injection",
    nodeTypes: [
      { id: "objective", label: "Objective", shortLabel: "A", semanticRole: "A" },
      { id: "need", label: "Need", shortLabel: "Need" },
      { id: "want", label: "Want", shortLabel: "Want" },
      { id: "injection", label: "Injection", shortLabel: "INJ" }
    ],
    canonicalPresentation: {
      columnTypes: ["OBJECTIVE", "NEED", "WANT"], branchField: "semanticBranchId",
      branchOrderField: "semanticBranchOrder", branchPathTypes: ["WANT", "NEED", "OBJECTIVE"], sharedRole: "A"
    }
  }
});

function legacyProjection(compiled) {
  const result = structuredClone(compiled.registryDefinition);
  delete result.definitionId;
  delete result.definitionVersion;
  delete result.definitionHash;
  delete result.semanticDiagramType;
  for (const nodeType of result.nodeTypes) delete nodeType.semanticType;
  return result;
}

async function main() {
  const compiledByRuntime = {};
  for (const [packageName, expectation] of Object.entries(packages)) {
    const loaded = await loadDefinition({
      kind: "directory",
      rootPath: path.join(root, "diagram-definitions", "official", packageName)
    }, { supportedCapabilities });
    const compiled = compileDefinition(loaded);
    compiledByRuntime[compiled.runtimeId] = compiled;
    assert.equal(compiled.runtimeId, expectation.runtimeId);
    assert.equal(compiled.semanticDiagramType, expectation.semanticType);
    assert.deepEqual(compiled.semanticProfile, semanticContract.profiles[expectation.semanticType]);
    assert.deepEqual(legacyProjection(compiled), legacyRegistry[expectation.runtimeId]);
    assert(Object.isFrozen(compiled) && Object.isFrozen(compiled.registryDefinition));

    for (const fixtureName of expectation.fixtures) {
      const packaged = loaded.fixtures[`fixtures/${fixtureName}`];
      const oracle = JSON.parse(fs.readFileSync(path.join(root, "semantic-contract", "v0.1", fixtureName), "utf8"));
      assert.deepEqual(packaged, oracle, `${packageName}/${fixtureName} drifted from its semantic oracle`);
      assert.equal(validateSemanticGraph(packaged).filter((issue) => issue.severity === "ERROR").length, 0);
    }
  }
  assert.deepEqual(Object.keys(compiledByRuntime).sort(), Object.keys(legacyRegistry).sort());

  const compilerSource = fs.readFileSync(path.join(root, "src/core/definition-runtime/capability-compiler.js"), "utf8");
  for (const forbidden of ["GOAL_TREE", "Goal Tree", "CRT", "Evaporating Cloud", "ltp.ec", "ltp.crt"]) {
    assert(!compilerSource.includes(forbidden), `Compiler contains privileged diagram branch: ${forbidden}`);
  }

  const unknown = structuredClone(require("../definition-contract/v1/fixtures/minimal-valid.json"));
  unknown.validationRules.push({ id: "unknown", severity: "ERROR", capability: "semantic.unknown.v1", parameters: {} });
  assert.throws(
    () => compileDefinition({ artifact: createDefinitionArtifact(unknown), fixtures: {} }),
    (error) => error.code === "DEFINITION_CAPABILITY_UNSUPPORTED"
  );

  const generated = spawnSync(process.execPath, [path.join(root, "scripts/build-official-definition-registry.js"), "--check"], {
    cwd: root, encoding: "utf8"
  });
  assert.equal(generated.status, 0, generated.stderr);
  console.log("Official definitions passed: secure loading, semantic and legacy parity, oracle fixtures, generic compilation and generated-registry freshness.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
