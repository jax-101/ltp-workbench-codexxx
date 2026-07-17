const path = require("node:path");
const { TransactionEngine, workspaceRevision } = require("./transaction-engine");
const { WorkspaceRepository } = require("./workspace-repository");
const { migrateWorkspace } = require("./workspace-migrations");
const { LtpError } = require("./errors");

class WorkspaceSession {
  constructor({ key, filePath, repository, engine }) {
    this.key = key;
    this.filePath = filePath;
    this.repository = repository;
    this.engine = engine;
  }

  get id() {
    return this.engine.getSnapshot().workspace?.id || this.key;
  }

  getSnapshot() {
    return this.engine.getSnapshot();
  }
}

class WorkspaceManager {
  constructor(options = {}) {
    this.repositoryFactory = options.repositoryFactory || ((filePath) => new WorkspaceRepository(filePath));
    this.engineFactory = options.engineFactory || ((workspace, engineOptions) => new TransactionEngine(workspace, engineOptions));
    this.migrate = options.migrate || migrateWorkspace;
    this.sessions = new Map();
    this.opening = new Map();
  }

  canonicalKey(locator) {
    if (typeof locator !== "string" || !locator.trim()) {
      throw new LtpError("WORKSPACE_LOCATOR_REQUIRED", "A workspace file or folder locator is required");
    }
    return path.resolve(locator);
  }

  async open(options = {}) {
    const filePath = this.canonicalKey(options.filePath || options.locator);
    const key = this.canonicalKey(options.key || filePath);
    if (this.sessions.has(key)) return this.sessions.get(key);
    if (this.opening.has(key)) return this.opening.get(key);
    if (!options.initialWorkspace && !options.loadInitialWorkspace) {
      throw new LtpError("WORKSPACE_INITIAL_STATE_REQUIRED", `Workspace ${key} requires initial state`, { key });
    }

    const opening = this.#open({ ...options, filePath, key })
      .then((session) => {
        this.sessions.set(key, session);
        this.opening.delete(key);
        return session;
      })
      .catch((error) => {
        this.opening.delete(key);
        throw error;
      });
    this.opening.set(key, opening);
    return opening;
  }

  async #open({ filePath, key, initialWorkspace, loadInitialWorkspace, reset = false }) {
    const source = initialWorkspace || await loadInitialWorkspace();
    const initial = this.migrate(source).workspace;
    const normalized = { ...initial, revision: workspaceRevision(initial) };
    const repository = this.repositoryFactory(filePath);
    const persisted = reset ? await repository.reset(normalized) : await repository.initialize(normalized);
    const migration = this.migrate(persisted);
    const ready = migration.changed ? await repository.reset(migration.workspace) : migration.workspace;
    const engine = this.engineFactory(ready, {
      persist: (workspace, metadata) => repository.commit(workspace, metadata)
    });
    return new WorkspaceSession({ key, filePath, repository, engine });
  }

  get(locator) {
    return this.sessions.get(this.canonicalKey(locator)) || null;
  }

  list() {
    return [...this.sessions.values()];
  }

  close(locator) {
    const key = this.canonicalKey(locator);
    if (this.opening.has(key)) {
      throw new LtpError("WORKSPACE_OPEN_IN_PROGRESS", `Workspace ${key} is still opening`, { key });
    }
    return this.sessions.delete(key);
  }
}

module.exports = { WorkspaceManager, WorkspaceSession };
