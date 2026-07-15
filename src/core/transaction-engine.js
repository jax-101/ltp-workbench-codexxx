const { applyPatches, enablePatches, produce, produceWithPatches } = require("immer");
const { createCommandRegistry } = require("./command-registry");
const { assertWorkspace } = require("./workspace-validator");
const { LtpError } = require("./errors");

enablePatches();

const clone = (value) => structuredClone(value);
const workspaceRevision = (workspace) => Number.isInteger(workspace?.revision) ? workspace.revision : 0;

const stampWorkspace = (workspace, revision, now) =>
  produce(workspace, (draft) => {
    draft.revision = revision;
    draft.updatedAt = now;
  });

const keepCurrentViewState = (current, candidate) =>
  produce(candidate, (draft) => {
    const currentViews = new Map((current.trees || []).map((tree) => [tree.id, tree.viewState]));
    for (const tree of draft.trees || []) {
      if (currentViews.has(tree.id)) tree.viewState = clone(currentViews.get(tree.id));
    }
  });

class TransactionEngine {
  constructor(initialWorkspace, options = {}) {
    assertWorkspace(initialWorkspace);
    this.registry = options.registry || createCommandRegistry();
    this.persist = options.persist || (async () => {});
    this.clock = options.clock || (() => new Date().toISOString());
    this.maxHistory = options.maxHistory || 100;
    this.workspace = stampWorkspace(clone(initialWorkspace), workspaceRevision(initialWorkspace), initialWorkspace.updatedAt || this.clock());
    this.undoStack = [];
    this.redoStack = [];
    this.completedCommands = new Map();
    this.queue = Promise.resolve();
  }

  getSnapshot() {
    return clone(this.workspace);
  }

  getHistoryState() {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoLabel: this.undoStack.at(-1)?.label || null,
      redoLabel: this.redoStack.at(-1)?.label || null,
      revision: workspaceRevision(this.workspace)
    };
  }

  execute(command, options = {}) {
    return this.#enqueue(() => this.#execute(command, options));
  }

  undo() {
    return this.#enqueue(() => this.#moveHistory("undo"));
  }

  redo() {
    return this.#enqueue(() => this.#moveHistory("redo"));
  }

  #enqueue(operation) {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }

  async #execute(command, options) {
    if (!command || typeof command !== "object") throw new LtpError("COMMAND_INVALID", "Command must be an object");
    if (!command.commandId) throw new LtpError("COMMAND_ID_REQUIRED", "commandId is required for idempotency");
    if (!command.type) throw new LtpError("COMMAND_TYPE_REQUIRED", "Command type is required");

    const previousResult = this.completedCommands.get(command.commandId);
    if (previousResult) {
      return {
        ...clone(previousResult),
        changed: false,
        duplicate: true,
        revision: workspaceRevision(this.workspace),
        workspace: this.getSnapshot(),
        history: this.getHistoryState()
      };
    }

    const currentRevision = workspaceRevision(this.workspace);
    if (command.expectedRevision !== currentRevision) {
      throw new LtpError("REVISION_CONFLICT", `Expected revision ${command.expectedRevision}, current revision is ${currentRevision}`, {
        expectedRevision: command.expectedRevision,
        currentRevision
      });
    }

    const now = this.clock();
    const [candidate, patches, inversePatches] = produceWithPatches(this.workspace, (draft) =>
      this.registry.apply(draft, command, { now })
    );
    const changed = patches.length > 0;
    if (!changed) return this.#result(false, command.label || command.type, [], options.dryRun);

    const nextRevision = currentRevision + 1;
    const nextWorkspace = stampWorkspace(candidate, nextRevision, now);
    assertWorkspace(nextWorkspace);

    if (options.dryRun) {
      return {
        ...this.#result(true, command.label || command.type, patches, true),
        workspace: clone(nextWorkspace)
      };
    }

    await this.persist(nextWorkspace, {
      expectedRevision: currentRevision,
      commandId: command.commandId,
      commandType: command.type,
      label: command.label || command.type
    });
    this.workspace = nextWorkspace;

    if (options.recordHistory !== false) {
      this.undoStack.push({
        commandId: command.commandId,
        label: command.label || command.type,
        patches: clone(patches),
        inversePatches: clone(inversePatches)
      });
      if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
      this.redoStack = [];
    }

    const result = this.#result(true, command.label || command.type, patches, false);
    this.completedCommands.set(command.commandId, result);
    if (this.completedCommands.size > this.maxHistory * 2) this.completedCommands.delete(this.completedCommands.keys().next().value);
    return clone(result);
  }

  async #moveHistory(direction) {
    const source = direction === "undo" ? this.undoStack : this.redoStack;
    const target = direction === "undo" ? this.redoStack : this.undoStack;
    const entry = source.at(-1);
    if (!entry) return this.#result(false, null, [], false);

    const currentRevision = workspaceRevision(this.workspace);
    const patches = direction === "undo" ? entry.inversePatches : entry.patches;
    const candidate = keepCurrentViewState(this.workspace, applyPatches(this.workspace, patches));
    const nextWorkspace = stampWorkspace(candidate, currentRevision + 1, this.clock());
    assertWorkspace(nextWorkspace);
    await this.persist(nextWorkspace, {
      expectedRevision: currentRevision,
      commandId: `${direction}:${entry.commandId}:${currentRevision + 1}`,
      commandType: `history.${direction}`,
      label: entry.label
    });

    this.workspace = nextWorkspace;
    source.pop();
    target.push(entry);
    return this.#result(true, entry.label, patches, false);
  }

  #result(changed, label, patches, dryRun) {
    return {
      changed,
      dryRun: Boolean(dryRun),
      label,
      revision: workspaceRevision(this.workspace) + (changed && dryRun ? 1 : 0),
      patches: clone(patches),
      workspace: this.getSnapshot(),
      history: this.getHistoryState()
    };
  }
}

module.exports = { TransactionEngine, workspaceRevision };
