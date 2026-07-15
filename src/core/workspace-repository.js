const fs = require("node:fs/promises");
const path = require("node:path");
const lockfile = require("proper-lockfile");
const { LtpError } = require("./errors");
const { workspaceRevision } = require("./transaction-engine");

class WorkspaceRepository {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read() {
    return JSON.parse(await fs.readFile(this.filePath, "utf8"));
  }

  async initialize(workspace) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.#writeAtomic(workspace);
    }
    return this.read();
  }

  async reset(workspace) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await this.#writeAtomic(workspace);
    return this.read();
  }

  async commit(workspace, options = {}) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const release = await lockfile.lock(this.filePath, {
      realpath: false,
      stale: 10000,
      retries: { retries: 5, factor: 1.5, minTimeout: 40, maxTimeout: 400 }
    });

    try {
      const current = await this.read();
      const currentRevision = workspaceRevision(current);
      if (currentRevision !== options.expectedRevision) {
        throw new LtpError("REVISION_CONFLICT", `Workspace changed on disk: expected ${options.expectedRevision}, found ${currentRevision}`, {
          expectedRevision: options.expectedRevision,
          currentRevision
        });
      }
      await this.#writeAtomic(workspace);
    } finally {
      await release();
    }
  }

  async #writeAtomic(workspace) {
    const directory = path.dirname(this.filePath);
    const temporaryPath = path.join(directory, `.${path.basename(this.filePath)}.${process.pid}.${Date.now()}.tmp`);
    let handle;
    try {
      handle = await fs.open(temporaryPath, "wx", 0o600);
      await handle.writeFile(`${JSON.stringify(workspace, null, 2)}\n`, "utf8");
      await handle.sync();
      await handle.close();
      handle = null;
      await fs.rename(temporaryPath, this.filePath);
      const directoryHandle = await fs.open(directory, "r");
      await directoryHandle.sync();
      await directoryHandle.close();
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      await fs.unlink(temporaryPath).catch(() => {});
      throw error;
    }
  }
}

module.exports = { WorkspaceRepository };
