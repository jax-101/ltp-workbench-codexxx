const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const ELK = require("elkjs/lib/elk.bundled.js");
const { TransactionEngine, workspaceRevision } = require("./core/transaction-engine");
const { WorkspaceRepository } = require("./core/workspace-repository");
const { getDiagramDefinition } = require("./core/diagram-registry");

let workspaceEngine = null;

const prototypeDataPath = () => {
  let fileName = "prototype-workspace.json";
  if (process.env.LTP_MANUAL_TEST === "1") fileName = "manual-test-workspace-v2.json";
  if (process.env.LTP_SMOKE_TEST === "1") fileName = "smoke-test-workspace.json";
  return path.join(app.getPath("userData"), fileName);
};
const sampleDataPath = () => path.join(app.getAppPath(), "outputs", "sample-workspace-v0.1.json");
const exportPath = () => path.join(app.getAppPath(), "outputs", "prototype-goal-tree-export.md");

const fallbackWorkspace = () => ({
  schemaVersion: "0.1",
  fixtureType: "fallback-workspace",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  workspace: {
    id: "ws-fallback",
    name: "Fallback Workspace",
    activeSystemId: "sys-fallback",
    settings: { keyboardFirst: true, defaultLayoutEngine: "elk", defaultExportFormat: "markdown" },
    systems: [{ id: "sys-fallback", name: "Fallback System", path: "systems/sys-fallback/system.json" }]
  },
  systems: [
    {
      schemaVersion: "0.1",
      id: "sys-fallback",
      name: "Fallback System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: {
        description: "Minimal fallback system.",
        purpose: "Keep prototype usable if sample data is unavailable.",
        owner: { name: "User", role: "Decision-maker" },
        boundary: { summary: "Fallback only.", inside: [], outside: [] },
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
      benchmarks: [{ id: "benchmark-fallback", type: "goalTree", treeId: "tree-fallback", status: "draft", isPrimary: true }],
      perspectives: [{ id: "perspective-fallback", name: "Benchmark", type: "benchmark", treeIds: ["tree-fallback"], status: "active", origin: null }]
    }
  ],
  trees: [
    {
      schemaVersion: "0.1",
      id: "tree-fallback",
      systemId: "sys-fallback",
      perspectiveId: "perspective-fallback",
      type: "goalTree",
      name: "Fallback Goal Tree",
      status: "draft",
      logicMode: "necessity",
      rootFrameId: "frame-root",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      frames: [{ id: "frame-root", treeId: "tree-fallback", parentFrameId: null, name: "Goal Tree", semanticType: "goalTree", collapsed: false, childFrameIds: [], nodeIds: ["node-goal"], notes: "" }],
      nodes: [{ id: "node-goal", treeId: "tree-fallback", frameId: "frame-root", type: "goal", statement: "The fallback tree loads.", shortLabel: "Fallback loads", status: "draft", tags: [], sourceIds: [], validation: {}, promotedFrom: null }],
      links: [],
      assumptions: [],
      layout: {
        engine: "elk",
        direction: "TB",
        lastRunAt: new Date().toISOString(),
        settings: { spacingNodeNode: 48, spacingLayer: 96, respectPinned: true, minimizeCrossings: true },
        frames: { "frame-root": { x: 80, y: 80, width: 420, height: 220, pinned: false, layoutSource: "auto" } },
        nodes: { "node-goal": { x: 170, y: 150, width: 240, height: 64, pinned: false, layoutSource: "auto" } },
        links: {}
      },
      viewState: { activeFrameId: "frame-root", selectedElementId: "node-goal", mode: "navigation", zoom: 1, pan: { x: 0, y: 0 }, breadcrumb: ["Fallback"] }
    }
  ],
  exports: []
});

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));

const loadWorkspace = async () => {
  if (process.env.LTP_SMOKE_TEST === "1") {
    try {
      return await readJson(sampleDataPath());
    } catch {
      return fallbackWorkspace();
    }
  }

  if (process.env.LTP_MANUAL_TEST === "1") {
    try {
      return await readJson(prototypeDataPath());
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      let workspace;
      try {
        workspace = await readJson(sampleDataPath());
      } catch {
        workspace = fallbackWorkspace();
      }
      return workspace;
    }
  }

  if (process.env.LTP_USE_SAMPLE === "1") {
    try {
      return await readJson(sampleDataPath());
    } catch {
      return fallbackWorkspace();
    }
  }

  try {
    return await readJson(prototypeDataPath());
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    let workspace;
    try {
      workspace = await readJson(sampleDataPath());
    } catch {
      workspace = fallbackWorkspace();
    }
    return workspace;
  }
};

const getWorkspaceEngine = async () => {
  if (workspaceEngine) return workspaceEngine;
  const initialWorkspace = await loadWorkspace();
  const repository = new WorkspaceRepository(prototypeDataPath());
  const normalizedWorkspace = {
    ...initialWorkspace,
    revision: workspaceRevision(initialWorkspace)
  };
  const persistedWorkspace = process.env.LTP_SMOKE_TEST === "1"
    ? await repository.reset(normalizedWorkspace)
    : await repository.initialize(normalizedWorkspace);
  workspaceEngine = new TransactionEngine(persistedWorkspace, {
    persist: (workspace, metadata) => repository.commit(workspace, metadata)
  });
  return workspaceEngine;
};

const saveWorkspaceTransaction = async (workspace, options = {}) => {
  const engine = await getWorkspaceEngine();
  const result = await engine.execute(
    {
      commandId: options.commandId || randomUUID(),
      type: "workspace.replace",
      label: options.label || "Update workspace",
      expectedRevision: workspaceRevision(workspace),
      payload: {
        workspace,
        includeViewState: options.includeViewState !== false
      }
    },
    { recordHistory: options.recordHistory !== false }
  );
  return result.workspace;
};

const saveViewStateTransaction = async (treeId, viewState) => {
  const engine = await getWorkspaceEngine();
  return engine.execute(
    {
      commandId: randomUUID(),
      type: "view.update",
      label: "Update view",
      expectedRevision: engine.getHistoryState().revision,
      payload: { treeId, viewState }
    },
    { recordHistory: false }
  );
};

const getActiveTree = (workspace) => workspace.trees[0];

const defaultLayoutDirection = (treeType) => getDiagramDefinition(treeType)?.defaultDirection || "TB";

const elkDirection = (direction) =>
  ({
    TB: "DOWN",
    BT: "UP",
    LR: "RIGHT",
    RL: "LEFT"
  })[direction] || "DOWN";

const nodeSize = (tree, nodeId) => {
  const existing = tree.layout?.nodes?.[nodeId];
  return {
    width: existing?.width || 250,
    height: existing?.height || 72
  };
};

const frameBounds = (tree, frame, nodePositions, framePositions) => {
  const padding = 28;
  const childBoxes = [
    ...frame.nodeIds.map((id) => nodePositions[id]).filter(Boolean),
    ...frame.childFrameIds.map((id) => framePositions[id]).filter(Boolean)
  ];

  if (!childBoxes.length) {
    return tree.layout?.frames?.[frame.id] || { x: 80, y: 80, width: 320, height: 180, pinned: false, layoutSource: "auto" };
  }

  const minX = Math.min(...childBoxes.map((box) => box.x)) - padding;
  const minY = Math.min(...childBoxes.map((box) => box.y)) - padding - 26;
  const maxX = Math.max(...childBoxes.map((box) => box.x + box.width)) + padding;
  const maxY = Math.max(...childBoxes.map((box) => box.y + box.height)) + padding;

  return {
    x: minX,
    y: minY,
    width: Math.max(260, maxX - minX),
    height: Math.max(160, maxY - minY),
    pinned: tree.layout?.frames?.[frame.id]?.pinned || false,
    layoutSource: "auto"
  };
};

const runLayout = async (workspace) => {
  const nextWorkspace = structuredClone(workspace);
  const tree = getActiveTree(nextWorkspace);
  const elk = new ELK();
  const direction = tree.layout?.direction || defaultLayoutDirection(tree.type);

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection(direction),
      "elk.spacing.nodeNode": String(tree.layout?.settings?.spacingNodeNode || 48),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(tree.layout?.settings?.spacingLayer || 96),
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP"
    },
    children: tree.nodes.map((node) => ({
      id: node.id,
      ...nodeSize(tree, node.id)
    })),
    edges: tree.links.map((link) => ({
      id: link.id,
      sources: [link.sourceNodeId],
      targets: [link.targetNodeId]
    }))
  };

  const laidOut = await elk.layout(graph);
  const nextNodeLayout = {};

  for (const child of laidOut.children || []) {
    const previous = tree.layout?.nodes?.[child.id] || {};
    nextNodeLayout[child.id] = previous.pinned
      ? previous
      : {
          x: Math.round((child.x || 0) + 90),
          y: Math.round((child.y || 0) + 90),
          width: Math.round(child.width || previous.width || 250),
          height: Math.round(child.height || previous.height || 72),
          pinned: false,
          layoutSource: "auto"
        };
  }

  const frameById = Object.fromEntries(tree.frames.map((frame) => [frame.id, frame]));
  const nextFrameLayout = {};
  const computeFrame = (frameId) => {
    if (nextFrameLayout[frameId]) {
      return nextFrameLayout[frameId];
    }
    const frame = frameById[frameId];
    for (const childFrameId of frame.childFrameIds) {
      computeFrame(childFrameId);
    }
    const previous = tree.layout?.frames?.[frameId] || {};
    nextFrameLayout[frameId] = previous.pinned ? previous : frameBounds(tree, frame, nextNodeLayout, nextFrameLayout);
    return nextFrameLayout[frameId];
  };
  computeFrame(tree.rootFrameId);
  for (const frame of tree.frames) {
    computeFrame(frame.id);
  }

  const nextLinkLayout = {};
  for (const link of tree.links) {
    const source = nextNodeLayout[link.sourceNodeId];
    const target = nextNodeLayout[link.targetNodeId];
    const previous = tree.layout?.links?.[link.id] || {};
    nextLinkLayout[link.id] = {
      route: previous.route || [],
      routeSource: previous.routeSource || "auto",
      labelPosition:
        source && target
          ? {
              x: Math.round((source.x + source.width / 2 + target.x + target.width / 2) / 2),
              y: Math.round((source.y + source.height / 2 + target.y + target.height / 2) / 2)
            }
          : previous.labelPosition || { x: 0, y: 0 }
    };
  }

  tree.layout = {
    ...tree.layout,
    engine: "elk",
    direction,
    lastRunAt: new Date().toISOString(),
    nodes: nextNodeLayout,
    frames: nextFrameLayout,
    links: nextLinkLayout
  };
  tree.updatedAt = new Date().toISOString();
  nextWorkspace.updatedAt = new Date().toISOString();
  return nextWorkspace;
};

const exportMarkdown = async (workspace) => {
  const system = workspace.systems[0];
  const tree = workspace.trees[0];
  const nodeById = Object.fromEntries(tree.nodes.map((node) => [node.id, node]));
  const assumptionsByLink = Object.groupBy
    ? Object.groupBy(tree.assumptions, (assumption) => assumption.linkId)
    : tree.assumptions.reduce((acc, assumption) => {
        acc[assumption.linkId] = acc[assumption.linkId] || [];
        acc[assumption.linkId].push(assumption);
        return acc;
      }, {});

  const goal = tree.nodes.find((node) => node.type === "goal");
  const linksTo = (targetId) => tree.links.filter((link) => link.targetNodeId === targetId);
  const lines = [
    `# ${tree.name}`,
    "",
    `System: ${system.name}`,
    "",
    "## System Profile",
    "",
    `- Owner: ${system.profile.owner?.name || "Unknown"}`,
    `- Purpose: ${system.profile.purpose || ""}`,
    `- Boundary: ${system.profile.boundary?.summary || ""}`,
    "",
    "## Goal",
    "",
    `- ${goal?.statement || "No goal defined"}`,
    "",
    "## Critical Success Factors",
    ""
  ];

  for (const csfLink of linksTo(goal?.id)) {
    const csf = nodeById[csfLink.sourceNodeId];
    if (!csf) continue;
    lines.push(`### ${csf.shortLabel || csf.statement}`);
    lines.push("");
    lines.push(csf.statement);
    lines.push("");
    lines.push(`Link: ${csfLink.verbalization}`);
    lines.push("");

    const assumptions = assumptionsByLink[csfLink.id] || [];
    if (assumptions.length) {
      lines.push("Assumptions:");
      for (const assumption of assumptions) {
        lines.push(`- ${assumption.statement}`);
      }
      lines.push("");
    }

    const ncLinks = linksTo(csf.id);
    if (ncLinks.length) {
      lines.push("Necessary Conditions:");
      for (const ncLink of ncLinks) {
        const nc = nodeById[ncLink.sourceNodeId];
        if (!nc) continue;
        lines.push(`- ${nc.statement}`);
      }
      lines.push("");
    }
  }

  await fs.mkdir(path.dirname(exportPath()), { recursive: true });
  await fs.writeFile(exportPath(), lines.join("\n"));
  return { path: exportPath(), markdown: lines.join("\n") };
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: process.env.LTP_MANUAL_TEST === "1" ? "LTP Workbench - Manual Test" : "LTP Workbench Prototype",
    backgroundColor: "#f7f5ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`Renderer: ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  if (process.env.LTP_SMOKE_TEST === "1") {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await mainWindow.webContents.executeJavaScript("window.__ltpSmokeTest && window.__ltpSmokeTest()");
        console.log(JSON.stringify(result));
        app.exit(result?.ok ? 0 : 1);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
  }
};

ipcMain.handle("workspace:load", async () => (await getWorkspaceEngine()).getSnapshot());
ipcMain.handle("workspace:save", async (_event, workspace, options) => saveWorkspaceTransaction(workspace, options));
ipcMain.handle("workspace:save-view", async (_event, treeId, viewState) => saveViewStateTransaction(treeId, viewState));
ipcMain.handle("workspace:execute", async (_event, command, options) => (await getWorkspaceEngine()).execute(command, options));
ipcMain.handle("history:undo", async () => (await getWorkspaceEngine()).undo());
ipcMain.handle("history:redo", async () => (await getWorkspaceEngine()).redo());
ipcMain.handle("history:state", async () => (await getWorkspaceEngine()).getHistoryState());
ipcMain.handle("layout:run", async (_event, workspace) => runLayout(workspace));
ipcMain.handle("export:markdown", async (_event, workspace) => exportMarkdown(workspace));

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
