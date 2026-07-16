const fs = require("node:fs");
const path = require("node:path");

const timestamp = "2026-07-16T12:00:00+02:00";
const treeId = "tree-money-goal-v1";
const canvasId = "canvas-money-goal";
const rootFrameId = "frame-canvas-root-money-goal";
const hostFrameId = "frame-money-goal-tree";

const nodeDefinitions = [
  ["goal", "goal", "Make more money now and in the future.", 600, 70, 300, 72],
  ["csf-maximum-revenues", "criticalSuccessFactor", "Maximum revenues", 120, 260, 250, 64],
  ["csf-optimized-cost", "criticalSuccessFactor", "Optimized cost", 600, 260, 250, 64],
  ["csf-high-return", "criticalSuccessFactor", "High return on investment", 1080, 260, 250, 64],
  ["sales-fill-capacity", "necessaryCondition", "Sales fill up production capacity", 60, 450, 250, 64],
  ["sufficient-production-capacity", "necessaryCondition", "Sufficient production capacity", 340, 450, 250, 64],
  ["efficient-production-operations", "necessaryCondition", "Efficient production operations", 620, 450, 250, 64],
  ["optimized-overhead", "necessaryCondition", "Optimized overhead", 900, 450, 250, 64],
  ["effective-capital-investment", "necessaryCondition", "Effective capital investment", 1180, 450, 250, 64],
  ["high-market-demand", "necessaryCondition", "High market demand", 80, 640, 250, 64],
  ["world-class-production-methods", "necessaryCondition", "World-class production methods", 500, 640, 250, 64],
  ["state-of-the-art-equipment", "necessaryCondition", "State-of-the-art equipment", 780, 640, 250, 64],
  ["optimized-inventory-management", "necessaryCondition", "Optimized inventory management", 1060, 640, 250, 64],
  ["optimum-product-price", "necessaryCondition", "Optimum product price", 40, 820, 250, 64],
  ["competitive-advantage", "necessaryCondition", "Competitive advantage", 320, 820, 250, 64],
  ["world-class-inventory-methods", "necessaryCondition", "World-class inventory management methods", 1080, 820, 250, 64],
  ["effective-marketing-sales", "necessaryCondition", "Effective marketing and sales", 300, 1000, 250, 64],
  ["superior-employees", "necessaryCondition", "Superior employees", 650, 1080, 250, 64]
];

const linkDefinitions = [
  ["csf-maximum-revenues", "goal"],
  ["csf-optimized-cost", "goal"],
  ["csf-high-return", "goal"],
  ["sales-fill-capacity", "csf-maximum-revenues"],
  ["sufficient-production-capacity", "csf-maximum-revenues"],
  ["efficient-production-operations", "csf-optimized-cost"],
  ["optimized-overhead", "csf-optimized-cost"],
  ["effective-capital-investment", "csf-high-return"],
  ["optimized-inventory-management", "csf-high-return"],
  ["high-market-demand", "sales-fill-capacity"],
  ["optimum-product-price", "high-market-demand"],
  ["competitive-advantage", "high-market-demand"],
  ["effective-marketing-sales", "competitive-advantage"],
  ["world-class-production-methods", "efficient-production-operations"],
  ["state-of-the-art-equipment", "efficient-production-operations"],
  ["state-of-the-art-equipment", "optimized-overhead"],
  ["world-class-inventory-methods", "optimized-inventory-management"],
  ["superior-employees", "sufficient-production-capacity"],
  ["superior-employees", "competitive-advantage"],
  ["superior-employees", "world-class-production-methods"],
  ["superior-employees", "optimized-inventory-management"]
];

const nodeId = (slug) => `node-money-${slug}`;
const linkId = (source, target) => `link-money-${source}-to-${target}`;

const nodes = nodeDefinitions.map(([slug, type, statement]) => ({
  id: nodeId(slug),
  treeId,
  frameId: hostFrameId,
  type,
  statement,
  shortLabel: statement,
  status: "draft",
  tags: type === "criticalSuccessFactor" ? ["csf"] : type === "necessaryCondition" ? ["nc"] : ["goal"],
  sourceIds: [],
  validation: {
    clarity: "unknown",
    entityExistence: "unknown",
    singleIdea: "unknown",
    completeSentence: "unknown",
    confidence: "medium",
    notes: ""
  },
  promotedFrom: null,
  createdAt: timestamp,
  updatedAt: timestamp
}));

const links = linkDefinitions.map(([source, target]) => {
  const sourceNode = nodes.find((node) => node.id === nodeId(source));
  const targetNode = nodes.find((node) => node.id === nodeId(target));
  return {
    id: linkId(source, target),
    treeId,
    sourceNodeId: sourceNode.id,
    targetNodeId: targetNode.id,
    type: "necessity",
    logic: "necessity",
    meaning: `${sourceNode.statement} is necessary for ${targetNode.statement}.`,
    verbalization: `In order to have ${targetNode.statement}, we must have ${sourceNode.statement}.`,
    assumptionIds: [],
    sourceIds: [],
    validation: {
      status: "draft",
      clarity: "unknown",
      logicCheck: "necessity-verbalized",
      missingAssumptions: true,
      notes: ""
    },
    visual: { route: [], routeSource: "auto", labelPosition: { x: 0, y: 0 } },
    createdAt: timestamp,
    updatedAt: timestamp
  };
});

const fixture = {
  schemaVersion: "0.2",
  fixtureType: "complex-goal-tree-visual-regression",
  createdAt: timestamp,
  updatedAt: timestamp,
  workspace: {
    id: "ws-complex-money-goal",
    name: "Complex Goal Tree Visual Fixture",
    activeSystemId: "sys-money-goal",
    settings: { keyboardFirst: true, defaultLayoutEngine: "elk", defaultExportFormat: "markdown" },
    systems: [{ id: "sys-money-goal", name: "Money Goal Tree", path: "systems/sys-money-goal/system.json", updatedAt: timestamp }]
  },
  systems: [
    {
      schemaVersion: "0.1",
      id: "sys-money-goal",
      name: "Money Goal Tree",
      createdAt: timestamp,
      updatedAt: timestamp,
      profile: {
        description: "Stable complex Goal Tree used for layout and visual regression.",
        purpose: "Exercise fan-in, shared enablers, cross-branch links and arrowhead clarity.",
        owner: { name: "LTP Workbench", role: "Regression fixture" },
        boundary: { summary: "The reference diagram supplied during interface review.", inside: [], outside: [] },
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
      benchmarks: [{ id: "benchmark-money-goal-v1", type: "goalTree", treeId, status: "draft", isPrimary: true, createdAt: timestamp, updatedAt: timestamp }],
      perspectives: [{ id: "perspective-money-goal", name: "Benchmark", type: "benchmark", treeIds: [treeId], status: "active", origin: null }]
    }
  ],
  trees: [
    {
      schemaVersion: "0.2",
      id: treeId,
      systemId: "sys-money-goal",
      perspectiveId: "perspective-money-goal",
      type: "goalTree",
      name: "Make More Money - Complex Goal Tree",
      status: "draft",
      logicMode: "necessity",
      createdAt: timestamp,
      updatedAt: timestamp,
      nodes,
      links,
      assumptions: [],
      layout: {
        engine: "elk",
        direction: "BT",
        lastRunAt: timestamp,
        settings: { spacingNodeNode: 48, spacingLayer: 96, respectPinned: true, minimizeCrossings: true },
        nodes: Object.fromEntries(
          nodeDefinitions.map(([slug, , , x, y, width, height]) => [
            nodeId(slug),
            { x, y, width, height, pinned: false, layoutSource: "manual" }
          ])
        ),
        links: Object.fromEntries(
          linkDefinitions.map(([source, target]) => [
            linkId(source, target),
            { route: [], routeSource: "auto", labelPosition: { x: 0, y: 0 } }
          ])
        )
      },
      canvasId,
      hostFrameId
    }
  ],
  exports: [],
  canvases: [
    {
      schemaVersion: "0.2",
      id: canvasId,
      systemId: "sys-money-goal",
      name: "Complex Money Goal canvas",
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
          name: "Goal Tree",
          semanticType: "goalTree",
          collapsed: false,
          childFrameIds: [],
          nodeIds: nodes.map((node) => node.id),
          notes: "Stable complex visual regression case",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      layout: {
        frames: {
          [hostFrameId]: { x: 48, y: 40, width: 1500, height: 1240, pinned: true, layoutSource: "manual" }
        }
      },
      viewState: {
        activeFrameId: hostFrameId,
        selectedElementId: nodeId("goal"),
        selectionRootIds: [nodeId("goal")],
        mode: "navigation",
        zoom: 0.8,
        pan: { x: 0, y: 0 },
        panels: { leftOpen: true, rightOpen: true },
        breadcrumb: ["Money Goal Tree", "Benchmark", "Goal Tree"]
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]
};

const outputPath = path.join(__dirname, "..", "outputs", "complex-goal-tree-workspace-v0.1.json");
fs.writeFileSync(outputPath, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Complex fixture written: ${nodes.length} nodes, ${links.length} links.`);
