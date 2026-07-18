const fs = require("node:fs/promises");
const path = require("node:path");
const { validateKeymap } = require("../core/keymap");
const { COMMAND_CATALOG, DEFAULT_KEYMAP } = require("../core/keymap-defaults");

const MAX_BYTES = 256 * 1024;
const clone = (value) => JSON.parse(JSON.stringify(value));

class KeymapStore {
  constructor(options = {}) {
    this.directory = options.directory;
    this.catalog = options.catalog || COMMAND_CATALOG;
    this.defaults = options.defaults || DEFAULT_KEYMAP;
  }

  paths() {
    return {
      active: path.join(this.directory, "keymap.v1.json"),
      lastGood: path.join(this.directory, "keymap.last-known-good.v1.json")
    };
  }

  async read(filePath) {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_BYTES) throw Object.assign(new Error("Keymap exceeds resource limit"), { code: "KEYMAP_TOO_LARGE" });
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  }

  async write(filePath, keymap) {
    await fs.mkdir(this.directory, { recursive: true });
    const temporary = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(keymap, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, filePath);
  }

  validate(candidate) {
    return validateKeymap(candidate, this.catalog);
  }

  async reset() {
    const keymap = clone(this.defaults);
    const { active, lastGood } = this.paths();
    await this.write(active, keymap);
    await this.write(lastGood, keymap);
    return { ok: true, status: "default", keymap, path: active, issues: [] };
  }

  async save(candidate) {
    const validation = this.validate(candidate);
    if (!validation.ok) {
      const current = await this.load();
      return { ok: false, status: "rejected", keymap: current.keymap, path: this.paths().active, issues: validation.issues };
    }
    const keymap = validation.keymap;
    const { active, lastGood } = this.paths();
    await this.write(active, keymap);
    await this.write(lastGood, keymap);
    return { ok: true, status: "saved", keymap, path: active, issues: [] };
  }

  async load() {
    const { active, lastGood } = this.paths();
    try {
      const candidate = await this.read(active);
      const validation = this.validate(candidate);
      if (validation.ok) return { ok: true, status: "loaded", keymap: validation.keymap, path: active, issues: [] };
      return this.recover(validation.issues);
    } catch (error) {
      if (error.code === "ENOENT") return this.reset();
      return this.recover([{ code: error.code || "KEYMAP_READ_FAILED", path: "$", message: error.message }]);
    }
  }

  async recover(issues) {
    const { active, lastGood } = this.paths();
    try {
      const candidate = await this.read(lastGood);
      const validation = this.validate(candidate);
      if (validation.ok) return { ok: true, status: "recovered", keymap: validation.keymap, path: active, issues };
    } catch {}
    return { ok: true, status: "fallback", keymap: clone(this.defaults), path: active, issues };
  }
}

module.exports = { KeymapStore, MAX_BYTES };
