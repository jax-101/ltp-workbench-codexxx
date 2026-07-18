const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { bindingFromEvent, resolveCommand, validateKeymap } = require("../src/core/keymap");
const { COMMAND_CATALOG, DEFAULT_KEYMAP } = require("../src/core/keymap-defaults");
const { KeymapStore } = require("../src/adapters/keymap-store");

const clone = (value) => JSON.parse(JSON.stringify(value));
const event = (key, options = {}) => ({ key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...options });

const run = async () => {
  const defaults = validateKeymap(DEFAULT_KEYMAP, COMMAND_CATALOG);
  assert.equal(defaults.ok, true);
  assert.equal(resolveCommand(event("h"), defaults.keymap.bindings), "showHints");
  assert.equal(resolveCommand(event("z", { metaKey: true }), defaults.keymap.bindings), "undo");
  const captured = bindingFromEvent(event("j", { metaKey: process.platform === "darwin", ctrlKey: process.platform !== "darwin" }));
  assert.equal(captured.primary, true);

  const duplicate = clone(DEFAULT_KEYMAP);
  duplicate.bindings.createNode = clone(duplicate.bindings.showHints);
  const collision = validateKeymap(duplicate, COMMAND_CATALOG);
  assert.equal(collision.ok, false);
  assert.equal(collision.issues.filter((item) => item.code === "SHORTCUT_COLLISION").length, 1);

  const scoped = clone(DEFAULT_KEYMAP);
  scoped.bindings.createNode = [{ key: "q", scope: "canvas" }];
  scoped.bindings.createFrame = [{ key: "q", scope: "assumptions" }];
  assert.equal(validateKeymap(scoped, COMMAND_CATALOG).ok, true, "exclusive scopes may share a physical shortcut");
  assert.equal(resolveCommand(event("q"), scoped.bindings, "canvas"), "createNode");
  assert.equal(resolveCommand(event("q"), scoped.bindings, "assumptions"), "createFrame");

  const platformCollision = clone(DEFAULT_KEYMAP);
  platformCollision.bindings.createNode = [{ key: "q", primary: true }];
  platformCollision.bindings.createFrame = [{ key: "q", control: true }];
  assert(validateKeymap(platformCollision, COMMAND_CATALOG).issues.some((item) => item.code === "SHORTCUT_COLLISION"));

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ltp-keymap-"));
  const store = new KeymapStore({ directory });
  const created = await store.load();
  assert.equal(created.status, "default");
  const custom = clone(created.keymap);
  custom.id = "personal";
  custom.bindings.showHints = [{ key: "j", scope: "workspace" }];
  assert.equal((await store.save(custom)).status, "saved");
  assert.equal((await store.load()).keymap.bindings.showHints[0].key, "j");

  await fs.writeFile(store.paths().active, JSON.stringify(duplicate));
  const recovered = await store.load();
  assert.equal(recovered.status, "recovered");
  assert.equal(recovered.keymap.id, "personal");
  assert(recovered.issues.some((item) => item.code === "SHORTCUT_COLLISION"));
  assert.equal((await store.reset()).keymap.id, "ltp.default");
  await fs.rm(directory, { recursive: true, force: true });
};

run().then(() => {
  console.log("Keymap passed: schema, scopes, platform collisions, atomic persistence and last-known-good recovery.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
