const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ltpPrototype", {
  getBuildInfo: () => ipcRenderer.invoke("app:build-info"),
  loadKeymap: () => ipcRenderer.invoke("keymap:load"),
  saveKeymap: (keymap) => ipcRenderer.invoke("keymap:save", keymap),
  resetKeymap: () => ipcRenderer.invoke("keymap:reset"),
  revealKeymap: () => ipcRenderer.invoke("keymap:reveal"),
  loadWorkspace: () => ipcRenderer.invoke("workspace:load"),
  getWorkspaceSessionInfo: () => ipcRenderer.invoke("workspace:session-info"),
  loadSampleWorkspaceFixture: () => ipcRenderer.invoke("fixture:sample-workspace"),
  loadComplexGoalTreeFixture: () => ipcRenderer.invoke("fixture:complex-goal-tree"),
  loadCrtFixture: () => ipcRenderer.invoke("fixture:crt"),
  loadEcFixture: () => ipcRenderer.invoke("fixture:ec"),
  loadRandomLayoutFixture: (options) => ipcRenderer.invoke("fixture:random-layout", options),
  saveWorkspace: (workspace, options) => ipcRenderer.invoke("workspace:save", workspace, options),
  saveViewState: (canvasId, viewState) => ipcRenderer.invoke("workspace:save-view", canvasId, viewState),
  executeCommand: (command, options) => ipcRenderer.invoke("workspace:execute", command, options),
  undo: () => ipcRenderer.invoke("history:undo"),
  redo: () => ipcRenderer.invoke("history:redo"),
  getHistoryState: () => ipcRenderer.invoke("history:state"),
  runLayout: (workspace, options) => ipcRenderer.invoke("layout:run", workspace, options),
  validateLayout: (workspace) => ipcRenderer.invoke("layout:validate", workspace),
  exportMarkdown: (workspace, treeId) => ipcRenderer.invoke("export:markdown", workspace, treeId)
});
