const fs = require("node:fs");
const path = require("node:path");
const { assertWorkspace } = require("../src/core/workspace-validator");
const { applyNativeSemanticProjection } = require("../src/core/semantic-render-projection");

const oracle = require("../semantic-contract/v0.1/crt.json");
const timestamp = "2026-07-17T12:00:00+02:00";

const buildCrtFixture = () => {
  const treeId = "tree-crt-oracle";
  const canvasId = "canvas-crt-oracle";
  const rootFrameId = "frame-crt-root";
  const hostFrameId = "frame-crt-diagram";
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
    fixtureType: "crt-native-semantic-vertical",
    createdAt: timestamp,
    updatedAt: timestamp,
    workspace: {
      id: "ws-crt-oracle",
      name: "CRT Semantic Oracle",
      activeSystemId: "sys-crt-oracle",
      settings: { keyboardFirst: true, defaultLayoutEngine: "elk", defaultExportFormat: "markdown" },
      systems: [{ id: "sys-crt-oracle", name: "CRT Oracle", path: "systems/sys-crt-oracle/system.json", updatedAt: timestamp }]
    },
    systems: [{
      schemaVersion: "0.1",
      id: "sys-crt-oracle",
      name: "CRT Oracle",
      createdAt: timestamp,
      updatedAt: timestamp,
      profile: {
        description: "Native semantic CRT fixture.",
        purpose: "Exercise causal layering, n-ary junctions and cycles.",
        owner: { name: "LTP Workbench", role: "Regression fixture" },
        boundary: { summary: "Canonical CRT oracle.", inside: [], outside: [] },
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
      benchmarks: [{ id: "benchmark-crt-oracle", type: "crt", treeId, status: "draft", isPrimary: true, createdAt: timestamp, updatedAt: timestamp }],
      perspectives: [{ id: "perspective-crt", name: "Current Reality", type: "currentReality", treeIds: [treeId], status: "active", origin: null }]
    }],
    trees: [{
      schemaVersion: "0.2",
      id: treeId,
      systemId: "sys-crt-oracle",
      perspectiveId: "perspective-crt",
      type: "crt",
      name: "Current Reality Tree - Semantic Oracle",
      status: "draft",
      logicMode: "sufficiency",
      createdAt: timestamp,
      updatedAt: timestamp,
      nodes: [],
      links: [],
      assumptions: [],
      semanticKernel,
      layout: {
        engine: "elk",
        direction: "BT",
        routingStyle: "CURVED",
        lastRunAt: null,
        settings: { spacingNodeNode: 64, spacingLayer: 112, respectPinned: true, minimizeCrossings: true },
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
      systemId: "sys-crt-oracle",
      name: "CRT Oracle canvas",
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
          name: "Current Reality Tree",
          semanticType: "crt",
          collapsed: false,
          childFrameIds: [],
          nodeIds: [],
          notes: "Native semantic CRT projection",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      layout: {
        frames: {
          [hostFrameId]: { x: 48, y: 40, width: 1100, height: 900, pinned: false, layoutSource: "semanticProjection" }
        }
      },
      viewState: {
        activeFrameId: hostFrameId,
        selectedElementId: "delivery",
        selectionRootIds: ["delivery"],
        mode: "navigation",
        zoom: 0.8,
        pan: { x: 0, y: 0 },
        panels: { leftOpen: true, rightOpen: true },
        breadcrumb: ["CRT Oracle", "Current Reality Tree"]
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }]
  };

  applyNativeSemanticProjection(workspace, workspace.trees[0]);
  assertWorkspace(workspace);
  return workspace;
};

if (require.main === module) {
  const outputPath = path.join(__dirname, "..", "outputs", "crt-workspace-v0.1.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(buildCrtFixture(), null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

module.exports = { buildCrtFixture };
