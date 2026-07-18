const path = require("node:path");
const { shell } = require("electron");
const { KeymapStore } = require("./keymap-store");

const registerKeymapIpc = ({ app, ipcMain }) => {
  const automated = ["LTP_SMOKE_TEST", "LTP_VISUAL_TEST", "LTP_SHORTCUT_TEST"].some((name) => process.env[name] === "1");
  const directory = automated
    ? path.join(app.getPath("temp"), "ltp-workbench-keymap-tests", String(process.pid))
    : app.getPath("userData");
  const store = new KeymapStore({ directory });
  ipcMain.handle("keymap:load", () => store.load());
  ipcMain.handle("keymap:save", (_event, keymap) => store.save(keymap));
  ipcMain.handle("keymap:reset", () => store.reset());
  ipcMain.handle("keymap:reveal", async () => shell.showItemInFolder((await store.load()).path));
  return store;
};

module.exports = { registerKeymapIpc };
