const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ltpPrototype", {
  getBuildInfo: () => ipcRenderer.invoke("app:build-info"),
  loadWorkspace: () => ipcRenderer.invoke("workspace:load"),
  saveWorkspace: (workspace, options) => ipcRenderer.invoke("workspace:save", workspace, options),
  saveViewState: (treeId, viewState) => ipcRenderer.invoke("workspace:save-view", treeId, viewState),
  executeCommand: (command, options) => ipcRenderer.invoke("workspace:execute", command, options),
  undo: () => ipcRenderer.invoke("history:undo"),
  redo: () => ipcRenderer.invoke("history:redo"),
  getHistoryState: () => ipcRenderer.invoke("history:state"),
  runLayout: (workspace) => ipcRenderer.invoke("layout:run", workspace),
  exportMarkdown: (workspace) => ipcRenderer.invoke("export:markdown", workspace)
});
