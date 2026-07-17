const fs = require("node:fs");
const path = require("node:path");
const { assertWorkspace } = require("../src/core/workspace-validator");
const { applyNativeSemanticProjection } = require("../src/core/semantic-render-projection");

const bipolarOracle = require("../semantic-contract/v0.1/ec.json");
const tripartiteOracle = require("../semantic-contract/v0.1/ec-tripartite.json");
const timestamp = "2026-07-17T16:00:00+02:00";

const buildEcFixture = ({ oracle = bipolarOracle, variant = "bipolar" } = {}) => {
  const tripartite = variant === "tripartite";
  const fixtureLabel = tripartite ? "EC Tripartite Oracle" : "EC Oracle";
  const treeId = "tree-ec-oracle";
  const canvasId = "canvas-ec-oracle";
  const rootFrameId = "frame-ec-root";
  const hostFrameId = "frame-ec-diagram";
  const semanticKernel = {
    kernelVersion: "0.1",
    contractVersion: "0.1",
    storageMode: "NATIVE",
    diagramType: oracle.diagramType,
    logicMode: oracle.logicMode,
    elements: structuredClone(oracle.elements),
    relations: structuredClone(oracle.relations),
    assumptions: structuredClone(oracle.assumptions),
    derivations: structuredClone(oracle.derivations),
    annotations: []
  };
  const workspace = {
    schemaVersion: "0.2",
    fixtureType: tripartite ? "ec-native-semantic-cloud-tripartite" : "ec-native-semantic-cloud",
    createdAt: timestamp,
    updatedAt: timestamp,
    workspace: {
      id: "ws-ec-oracle",
      name: tripartite ? "EC Tripartite Semantic Oracle" : "EC Semantic Oracle",
      activeSystemId: "sys-ec-oracle",
      settings: { keyboardFirst: true, defaultLayoutEngine: "elk", defaultExportFormat: "markdown" },
      systems: [{ id: "sys-ec-oracle", name: fixtureLabel, path: "systems/sys-ec-oracle/system.json", updatedAt: timestamp }]
    },
    systems: [{
      schemaVersion: "0.1",
      id: "sys-ec-oracle",
      name: fixtureLabel,
      createdAt: timestamp,
      updatedAt: timestamp,
      profile: {
        description: `Native semantic ${tripartite ? "tripartite " : ""}Evaporating Cloud fixture.`,
        purpose: tripartite
          ? "Exercise dynamic parallel branches, a connected conflict graph and assumptions on every line."
          : "Exercise canonical roles, parallel necessity branches, conflict assumptions and injections.",
        owner: { name: "LTP Workbench", role: "Regression fixture" },
        boundary: { summary: "Canonical EC oracle.", inside: [], outside: [] },
        spanOfControl: [],
        sphereOfInfluence: [],
        externalEnvironment: [],
        stakeholders: [],
        constraints: [],
        initialSymptoms: [],
        sourceIds: [],
        completeness: "minimumComplete"
      },
      relationships: { parentSystemIds: [], childSystemIds: [] },
      sources: [],
      benchmarks: [{ id: "benchmark-ec-oracle", type: "ec", treeId, status: "draft", isPrimary: true, createdAt: timestamp, updatedAt: timestamp }],
      perspectives: [{ id: "perspective-ec", name: "Conflict", type: "conflict", treeIds: [treeId], status: "active", origin: null }]
    }],
    trees: [{
      schemaVersion: "0.2",
      id: treeId,
      systemId: "sys-ec-oracle",
      perspectiveId: "perspective-ec",
      type: "ec",
      name: tripartite ? "Evaporating Cloud - Tripartite Oracle" : "Evaporating Cloud - Semantic Oracle",
      status: "draft",
      logicMode: "necessity",
      createdAt: timestamp,
      updatedAt: timestamp,
      nodes: [],
      links: [],
      assumptions: [],
      semanticKernel,
      layout: {
        engine: "elk",
        direction: "RL",
        routingStyle: "CURVED",
        lastRunAt: null,
        settings: { spacingNodeNode: 72, spacingLayer: 126, respectPinned: true, minimizeCrossings: true },
        nodes: {},
        links: {}
      },
      canvasId,
      hostFrameId
    }],
    exports: [],
    canvases: [{
      schemaVersion: "0.2",
      id: canvasId,
      systemId: "sys-ec-oracle",
      name: `${fixtureLabel} canvas`,
      rootFrameId,
      frames: [
        {
          id: rootFrameId,
          canvasId,
          treeId: null,
          kind: "root",
          parentFrameId: null,
          name: "Root",
          semanticType: "workspaceRoot",
          collapsed: false,
          childFrameIds: [hostFrameId],
          nodeIds: [],
          notes: "Infinite workspace root"
        },
        {
          id: hostFrameId,
          canvasId,
          treeId,
          kind: "diagram",
          parentFrameId: rootFrameId,
          name: "Evaporating Cloud",
          semanticType: "ec",
          collapsed: false,
          childFrameIds: [],
          nodeIds: [],
          notes: "Native semantic EC projection",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      layout: {
        frames: {
          [hostFrameId]: { x: 48, y: 40, width: 1180, height: 600, pinned: false, layoutSource: "semanticProjection" }
        }
      },
      viewState: {
        activeFrameId: hostFrameId,
        selectedElementId: "objective",
        selectionRootIds: ["objective"],
        mode: "navigation",
        zoom: 0.9,
        pan: { x: 0, y: 0 },
        panels: { leftOpen: true, rightOpen: true },
        breadcrumb: [fixtureLabel, "Evaporating Cloud"]
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }]
  };

  applyNativeSemanticProjection(workspace, workspace.trees[0]);
  assertWorkspace(workspace);
  return workspace;
};

const buildEcTripartiteFixture = () => buildEcFixture({ oracle: tripartiteOracle, variant: "tripartite" });

if (require.main === module) {
  const outputPath = path.join(__dirname, "..", "outputs", "ec-workspace-v0.1.json");
  const tripartiteOutputPath = path.join(__dirname, "..", "outputs", "ec-tripartite-workspace-v0.1.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(buildEcFixture(), null, 2)}\n`);
  fs.writeFileSync(tripartiteOutputPath, `${JSON.stringify(buildEcTripartiteFixture(), null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${tripartiteOutputPath}`);
}

module.exports = { buildEcFixture, buildEcTripartiteFixture };
