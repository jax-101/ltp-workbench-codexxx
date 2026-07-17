const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { workspaceRevision } = require("./core/transaction-engine");
const { WorkspaceManager } = require("./core/workspace-manager");
const { listDocuments, resolveDocument } = require("./core/document-view");
const { runComposedLayout, validateComposedGeometry } = require("./core/composed-layout");
const { migrateWorkspace } = require("./core/workspace-migrations");
const { generateRandomLayoutFixture } = require("./core/random-layout-fixture");
const { buildMarkdownExport } = require("./core/markdown-export");
const packageMetadata = require("../package.json");

const workspaceManager = new WorkspaceManager();

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
  if (process.env.LTP_COMPLEX_TEST === "1") fileName = "complex-goal-tree-manual-test.json";
  if (process.env.LTP_SMOKE_TEST === "1") fileName = "smoke-test-workspace.json";
  if (process.env.LTP_VISUAL_TEST === "1") fileName = "visual-test-workspace.json";
  if (process.env.LTP_SHORTCUT_TEST === "1") fileName = "shortcut-test-workspace.json";
  if (process.env.LTP_CRT_TEST === "1") fileName = "crt-test-workspace.json";
  if (process.env.LTP_EC_TEST === "1") fileName = "ec-test-workspace.json";
  return path.join(app.getPath("userData"), fileName);
};
const sampleDataPath = () => path.join(app.getAppPath(), "outputs", "sample-workspace-v0.1.json");
const complexFixturePath = () => path.join(app.getAppPath(), "outputs", "complex-goal-tree-workspace-v0.1.json");
const crtFixturePath = () => path.join(app.getAppPath(), "outputs", "crt-workspace-v0.1.json");
const ecFixturePath = () => path.join(app.getAppPath(), "outputs", "ec-workspace-v0.1.json");
const exportPath = (tree) => path.join(
  app.getAppPath(),
  "outputs",
  tree.type === "goalTree" ? "prototype-goal-tree-export.md" : `prototype-${tree.type}-export.md`
);

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
  if (process.env.LTP_CRT_TEST === "1") {
    return readJson(crtFixturePath());
  }
  if (process.env.LTP_EC_TEST === "1") {
    return readJson(ecFixturePath());
  }

  if (process.env.LTP_SMOKE_TEST === "1" || process.env.LTP_VISUAL_TEST === "1" || process.env.LTP_SHORTCUT_TEST === "1") {
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

  if (process.env.LTP_COMPLEX_TEST === "1") {
    try {
      return await readJson(prototypeDataPath());
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return readJson(complexFixturePath());
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

const getWorkspaceSession = () => workspaceManager.open({
  filePath: prototypeDataPath(),
  loadInitialWorkspace: loadWorkspace,
  reset: process.env.LTP_SMOKE_TEST === "1" || process.env.LTP_VISUAL_TEST === "1" || process.env.LTP_SHORTCUT_TEST === "1" || process.env.LTP_CRT_TEST === "1" || process.env.LTP_EC_TEST === "1"
});

const getWorkspaceEngine = async () => (await getWorkspaceSession()).engine;

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

const exportMarkdown = async (workspace, treeId) => {
  const tree = resolveDocument(workspace, treeId);
  const system = workspace.systems.find((candidate) => candidate.id === tree.systemId);
  if (!system) throw new Error(`System ${tree.systemId} was not found for tree ${tree.id}`);
  const markdown = buildMarkdownExport(tree, system);
  const targetPath = exportPath(tree);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, markdown);
  return { path: targetPath, markdown };
};

const runVisualTest = async (mainWindow) => {
  const steps = [
    "baseline",
    "frame-summary",
    "frame-minimized",
    "frame-minimize-undo",
    "frame-minimize-redo",
    "frame-expanded",
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
    "multi-connect",
    "readable-routing",
    "internal-frame-layout",
    "multi-entity-frame-targets",
    "cycle-breaking",
    "random-sparse-4101-before",
    "random-sparse-4101-after",
    "random-cross-frame-4102-before",
    "random-cross-frame-4102-after",
    "random-nested-4103-before",
    "random-nested-4103-after",
    "random-fan-in-4104-before",
    "random-fan-in-4104-after"
  ];
  const evidenceDirectory = path.join(app.getAppPath(), "outputs", "test-evidence", buildInfo.id);
  await fs.rm(evidenceDirectory, { recursive: true, force: true });
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
      ...(result.assessment ? [`- Visual assessment: ${result.assessment}`] : []),
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

const runCrtVisualTest = async (mainWindow) => {
  const evidenceDirectory = path.join(app.getAppPath(), "outputs", "test-evidence", buildInfo.id, "crt");
  await fs.rm(evidenceDirectory, { recursive: true, force: true });
  await fs.mkdir(evidenceDirectory, { recursive: true });
  mainWindow.setIgnoreMouseEvents(true);
  const result = await mainWindow.webContents.executeJavaScript(
    "window.__ltpCrtVisualTest && window.__ltpCrtVisualTest()"
  );
  const image = await mainWindow.webContents.capturePage();
  const screenshot = "crt-oracle-layout.png";
  await fs.writeFile(path.join(evidenceDirectory, screenshot), image.toPNG());
  const report = { build: buildInfo, generatedAt: new Date().toISOString(), ...result, screenshot };
  await fs.writeFile(path.join(evidenceDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(
    path.join(evidenceDirectory, "report.md"),
    `# CRT visual test - build ${buildInfo.id}\n\nResult: ${report.ok ? "PASS" : "FAIL"}\n\n${report.detail}\n\n![CRT oracle](${screenshot})\n`
  );
  console.log(JSON.stringify({ ok: report.ok, evidenceDirectory, detail: report.detail }));
  return report;
};

const runEcVisualTest = async (mainWindow) => {
  const evidenceDirectory = path.join(app.getAppPath(), "outputs", "test-evidence", buildInfo.id, "ec");
  await fs.rm(evidenceDirectory, { recursive: true, force: true });
  await fs.mkdir(evidenceDirectory, { recursive: true });
  mainWindow.setIgnoreMouseEvents(true);
  const result = await mainWindow.webContents.executeJavaScript(
    "window.__ltpEcVisualTest && window.__ltpEcVisualTest()"
  );
  const image = await mainWindow.webContents.capturePage();
  const screenshot = "ec-oracle-layout.png";
  await fs.writeFile(path.join(evidenceDirectory, screenshot), image.toPNG());
  const report = { build: buildInfo, generatedAt: new Date().toISOString(), ...result, screenshot };
  await fs.writeFile(path.join(evidenceDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(
    path.join(evidenceDirectory, "report.md"),
    `# EC visual test - build ${buildInfo.id}\n\nResult: ${report.ok ? "PASS" : "FAIL"}\n\n${report.detail}\n\n![EC oracle](${screenshot})\n`
  );
  console.log(JSON.stringify({ ok: report.ok, evidenceDirectory, detail: report.detail }));
  return report;
};

const shortcutFilePart = (value) =>
  String(value)
    .replaceAll(" ", "space")
    .replaceAll("/", "slash")
    .replaceAll("[", "left-bracket")
    .replaceAll("]", "right-bracket")
    .replaceAll("+", "plus")
    .replaceAll("=", "equals")
    .replaceAll(/[^a-z0-9-]+/gi, "-")
    .replaceAll(/^-|-$/g, "")
    .toLowerCase();

const runShortcutAudit = async (mainWindow) => {
  const manifest = await mainWindow.webContents.executeJavaScript(
    "window.__ltpShortcutAuditManifest && window.__ltpShortcutAuditManifest()"
  );
  const evidenceDirectory = path.join(app.getAppPath(), "outputs", "shortcut-audit", buildInfo.id);
  await fs.rm(evidenceDirectory, { recursive: true, force: true });
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const results = [];

  for (let index = 0; index < manifest.length; index += 1) {
    const testCase = manifest[index];
    const result = await mainWindow.webContents.executeJavaScript(
      `window.__ltpShortcutAuditStep && window.__ltpShortcutAuditStep(${JSON.stringify(testCase.command)}, ${testCase.bindingIndex})`
    );
    await new Promise((resolve) => setTimeout(resolve, 180));
    const image = await mainWindow.webContents.capturePage();
    const fileName = `${String(index + 1).padStart(2, "0")}-${shortcutFilePart(testCase.command)}-${shortcutFilePart(testCase.shortcut)}.png`;
    await fs.writeFile(path.join(evidenceDirectory, fileName), image.toPNG());
    results.push({ ...testCase, ...result, screenshot: fileName });
  }

  const commandCount = new Set(results.map((result) => result.command)).size;
  const passed = results.filter((result) => result.ok).length;
  const report = {
    build: buildInfo,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    commandCount,
    bindingCount: results.length,
    passed,
    failed: results.length - passed,
    ok: passed === results.length,
    results
  };
  const markdown = [
    `# Keyboard shortcut audit - build ${buildInfo.id}`,
    "",
    `Result: ${report.ok ? "PASS" : "FAIL"}`,
    `Platform: ${process.platform}`,
    `Commands: ${commandCount}`,
    `Bindings: ${results.length}`,
    `Passed: ${report.passed}`,
    `Failed: ${report.failed}`,
    "",
    "| # | Command | Shortcut | Result | Observed effect | Evidence |",
    "|---:|---|---|---|---|---|",
    ...results.map(
      (result, index) =>
        `| ${index + 1} | ${result.label} | \`${result.shortcut}\` | ${result.ok ? "PASS" : "FAIL"} | ${String(result.detail).replaceAll("|", "\\|")} | [PNG](${result.screenshot}) |`
    ),
    "",
    ...results
      .filter((result) => !result.ok)
      .flatMap((result) => [
        `## Failure: ${result.label} (${result.shortcut})`,
        "",
        result.detail,
        "",
        `Evidence: [${result.screenshot}](${result.screenshot})`,
        ""
      ])
  ].join("\n");
  await fs.writeFile(path.join(evidenceDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(evidenceDirectory, "report.md"), markdown);
  console.log(JSON.stringify({ ok: report.ok, evidenceDirectory, commandCount, bindings: results.length, passed, failed: report.failed }));
  return report;
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: `LTP Workbench - ${buildLabel()}${process.env.LTP_MANUAL_TEST === "1" ? " - Manual Test" : ""}${process.env.LTP_COMPLEX_TEST === "1" ? " - Complex Goal Tree Test" : ""}${process.env.LTP_CRT_TEST === "1" ? " - CRT Test" : ""}${process.env.LTP_EC_TEST === "1" ? " - EC Test" : ""}`,
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

  if (process.env.LTP_SHORTCUT_TEST === "1") {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await runShortcutAudit(mainWindow);
        app.exit(result.ok ? 0 : 1);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
  }

  if (process.env.LTP_CRT_TEST === "1") {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await runCrtVisualTest(mainWindow);
        app.exit(result.ok ? 0 : 1);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
  }

  if (process.env.LTP_EC_TEST === "1") {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await runEcVisualTest(mainWindow);
        app.exit(result.ok ? 0 : 1);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
  }
};

ipcMain.handle("workspace:load", async () => (await getWorkspaceEngine()).getSnapshot());
ipcMain.handle("workspace:session-info", async () => {
  const session = await getWorkspaceSession();
  const workspace = session.getSnapshot();
  return { id: session.id, locator: session.key, documents: listDocuments(workspace) };
});
ipcMain.handle("fixture:sample-workspace", async () => migrateWorkspace(await readJson(sampleDataPath())).workspace);
ipcMain.handle("fixture:complex-goal-tree", async () => migrateWorkspace(await readJson(complexFixturePath())).workspace);
ipcMain.handle("fixture:crt", async () => migrateWorkspace(await readJson(crtFixturePath())).workspace);
ipcMain.handle("fixture:ec", async () => migrateWorkspace(await readJson(ecFixturePath())).workspace);
ipcMain.handle("fixture:random-layout", async (_event, options) =>
  generateRandomLayoutFixture(migrateWorkspace(await readJson(complexFixturePath())).workspace, options)
);
ipcMain.handle("app:build-info", async () => buildInfo);
ipcMain.handle("workspace:save", async (_event, workspace, options) => saveWorkspaceTransaction(workspace, options));
ipcMain.handle("workspace:save-view", async (_event, canvasId, viewState) => saveViewStateTransaction(canvasId, viewState));
ipcMain.handle("workspace:execute", async (_event, command, options) => (await getWorkspaceEngine()).execute(command, options));
ipcMain.handle("history:undo", async () => (await getWorkspaceEngine()).undo());
ipcMain.handle("history:redo", async () => (await getWorkspaceEngine()).redo());
ipcMain.handle("history:state", async () => (await getWorkspaceEngine()).getHistoryState());
ipcMain.handle("layout:run", async (_event, workspace, options) => runComposedLayout(workspace, options));
ipcMain.handle("layout:validate", async (_event, workspace) => validateComposedGeometry(workspace));
ipcMain.handle("export:markdown", async (_event, workspace, treeId) => exportMarkdown(workspace, treeId));

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
