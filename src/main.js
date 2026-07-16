const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { TransactionEngine, workspaceRevision } = require("./core/transaction-engine");
const { WorkspaceRepository } = require("./core/workspace-repository");
const { runComposedLayout, validateComposedGeometry } = require("./core/composed-layout");
const { migrateWorkspace } = require("./core/workspace-migrations");
const packageMetadata = require("../package.json");

let workspaceEngine = null;
let workspaceEnginePromise = null;

const buildInfo = Object.freeze({
  version: packageMetadata.version,
  id: packageMetadata.ltpBuild?.id || "local",
  name: packageMetadata.ltpBuild?.name || "Development Build",
  channel: packageMetadata.ltpBuild?.channel || "development"
});

const buildLabel = () => `v${buildInfo.version} - build ${buildInfo.id} - ${buildInfo.name}`;

const prototypeDataPath = () => {
  let fileName = "prototype-workspace.json";
  if (process.env.LTP_MANUAL_TEST === "1") fileName = "manual-test-workspace-v2.json";
  if (process.env.LTP_SMOKE_TEST === "1") fileName = "smoke-test-workspace.json";
  if (process.env.LTP_VISUAL_TEST === "1") fileName = "visual-test-workspace.json";
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
  if (process.env.LTP_SMOKE_TEST === "1" || process.env.LTP_VISUAL_TEST === "1") {
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
  if (!workspaceEnginePromise) {
    workspaceEnginePromise = (async () => {
      const initialWorkspace = migrateWorkspace(await loadWorkspace()).workspace;
      const repository = new WorkspaceRepository(prototypeDataPath());
      const normalizedWorkspace = {
        ...initialWorkspace,
        revision: workspaceRevision(initialWorkspace)
      };
      const persistedWorkspace = process.env.LTP_SMOKE_TEST === "1" || process.env.LTP_VISUAL_TEST === "1"
        ? await repository.reset(normalizedWorkspace)
        : await repository.initialize(normalizedWorkspace);
      const migration = migrateWorkspace(persistedWorkspace);
      const readyWorkspace = migration.changed ? await repository.reset(migration.workspace) : migration.workspace;
      workspaceEngine = new TransactionEngine(readyWorkspace, {
        persist: (workspace, metadata) => repository.commit(workspace, metadata)
      });
      return workspaceEngine;
    })().catch((error) => {
      workspaceEnginePromise = null;
      throw error;
    });
  }
  return workspaceEnginePromise;
};

const saveWorkspaceTransaction = async (workspace, options = {}) => {
  const engine = await getWorkspaceEngine();
  const result = await engine.execute(
    {
      commandId: options.commandId || randomUUID(),
      type: "workspace.replace",
      label: options.label || "Update workspace",
      category: options.category || "content",
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

const saveViewStateTransaction = async (canvasId, viewState) => {
  const engine = await getWorkspaceEngine();
  return engine.execute(
    {
      commandId: randomUUID(),
      type: "view.update",
      label: "Update view",
      expectedRevision: engine.getHistoryState().revision,
      payload: { canvasId, viewState }
    },
    { recordHistory: false }
  );
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

const runVisualTest = async (mainWindow) => {
  const steps = [
    "baseline",
    "frame-summary",
    "entity-frame-target-open",
    "entity-moved-to-root",
    "entity-moved-to-parent",
    "frame-target-open",
    "frame-moved-inside-frame",
    "frame-moved-to-parent",
    "frame-parent-undo",
    "frame-parent-redo",
    "composed-layout-setup",
    "composed-layout-applied",
    "composed-layout-undo",
    "composed-layout-redo",
    "multi-open",
    "multi-selected",
    "multi-closed",
    "group-moved",
    "group-undo",
    "group-redo",
    "multi-connect"
  ];
  const evidenceDirectory = path.join(app.getAppPath(), "outputs", "test-evidence", buildInfo.id);
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const results = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const result = await mainWindow.webContents.executeJavaScript(
      `window.__ltpVisualTestStep && window.__ltpVisualTestStep(${JSON.stringify(step)})`
    );
    await new Promise((resolve) => setTimeout(resolve, 180));
    const image = await mainWindow.webContents.capturePage();
    const fileName = `${String(index + 1).padStart(2, "0")}-${step}.png`;
    await fs.writeFile(path.join(evidenceDirectory, fileName), image.toPNG());
    results.push({ ...result, step, screenshot: fileName });
  }

  const report = {
    build: buildInfo,
    generatedAt: new Date().toISOString(),
    ok: results.every((result) => result.ok),
    results
  };
  const markdown = [
    `# Visual test report - build ${buildInfo.id}`,
    "",
    `Result: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    ...results.flatMap((result, index) => [
      `## ${index + 1}. ${result.title}`,
      "",
      `- Result: ${result.ok ? "PASS" : "FAIL"}`,
      `- Check: ${result.detail}`,
      `- Screenshot: ${result.screenshot}`,
      ""
    ])
  ].join("\n");
  await fs.writeFile(path.join(evidenceDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(evidenceDirectory, "report.md"), markdown);
  console.log(JSON.stringify({ ok: report.ok, evidenceDirectory, results }));
  return report;
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: `LTP Workbench - ${buildLabel()}${process.env.LTP_MANUAL_TEST === "1" ? " - Manual Test" : ""}`,
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

  if (process.env.LTP_VISUAL_TEST === "1") {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await runVisualTest(mainWindow);
        app.exit(result.ok ? 0 : 1);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
  }
};

ipcMain.handle("workspace:load", async () => (await getWorkspaceEngine()).getSnapshot());
ipcMain.handle("app:build-info", async () => buildInfo);
ipcMain.handle("workspace:save", async (_event, workspace, options) => saveWorkspaceTransaction(workspace, options));
ipcMain.handle("workspace:save-view", async (_event, canvasId, viewState) => saveViewStateTransaction(canvasId, viewState));
ipcMain.handle("workspace:execute", async (_event, command, options) => (await getWorkspaceEngine()).execute(command, options));
ipcMain.handle("history:undo", async () => (await getWorkspaceEngine()).undo());
ipcMain.handle("history:redo", async () => (await getWorkspaceEngine()).redo());
ipcMain.handle("history:state", async () => (await getWorkspaceEngine()).getHistoryState());
ipcMain.handle("layout:run", async (_event, workspace) => runComposedLayout(workspace));
ipcMain.handle("layout:validate", async (_event, workspace) => validateComposedGeometry(workspace));
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
