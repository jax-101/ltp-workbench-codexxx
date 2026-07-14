const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ltpPrototype", {
  loadWorkspace: () => ipcRenderer.invoke("workspace:load"),
  saveWorkspace: (workspace) => ipcRenderer.invoke("workspace:save", workspace),
  runLayout: (workspace) => ipcRenderer.invoke("layout:run", workspace),
  exportMarkdown: (workspace) => ipcRenderer.invoke("export:markdown", workspace)
});
