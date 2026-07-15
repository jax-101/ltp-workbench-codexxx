#!/usr/bin/env node

const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { TransactionEngine, workspaceRevision } = require("../src/core/transaction-engine");
const { WorkspaceRepository } = require("../src/core/workspace-repository");
const { validateWorkspace } = require("../src/core/workspace-validator");

const args = process.argv.slice(2);
const positional = [];
const flags = {};
for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  if (!value.startsWith("--")) {
    positional.push(value);
    continue;
  }
  const key = value.slice(2);
  const next = args[index + 1];
  if (!next || next.startsWith("--")) flags[key] = true;
  else {
    flags[key] = next;
    index += 1;
  }
}

const output = (payload, humanText) => {
  if (flags.json || !humanText) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stdout.write(`${humanText}\n`);
};

const requireFlag = (name) => {
  if (!flags[name] || flags[name] === true) {
    const error = new Error(`--${name} is required`);
    error.code = "ARGUMENT_REQUIRED";
    throw error;
  }
  return flags[name];
};

const readWorkspace = async () => JSON.parse(await fs.readFile(requireFlag("workspace"), "utf8"));

const createEngine = async () => {
  const workspacePath = requireFlag("workspace");
  const repository = new WorkspaceRepository(workspacePath);
  const workspace = await repository.read();
  return new TransactionEngine(workspace, {
    persist: (nextWorkspace, metadata) => repository.commit(nextWorkspace, metadata)
  });
};

const parseExpectedRevision = () => {
  const value = Number(requireFlag("expected-revision"));
  if (!Number.isInteger(value) || value < 0) {
    const error = new Error("--expected-revision must be a non-negative integer");
    error.code = "ARGUMENT_INVALID";
    throw error;
  }
  return value;
};

const run = async () => {
  const [resource, action] = positional;

  if (resource === "validate") {
    const workspace = await readWorkspace();
    const issues = validateWorkspace(workspace);
    output(
      { ok: issues.length === 0, revision: workspaceRevision(workspace), issues },
      issues.length ? `Invalid workspace: ${issues.length} issue(s)` : `Workspace valid at revision ${workspaceRevision(workspace)}`
    );
    if (issues.length) process.exitCode = 2;
    return;
  }

  if (resource === "tree" && action === "list") {
    const workspace = await readWorkspace();
    const trees = (workspace.trees || []).map((tree) => ({
      id: tree.id,
      type: tree.type,
      name: tree.name,
      status: tree.status,
      nodes: tree.nodes.length,
      frames: tree.frames.length,
      links: tree.links.length
    }));
    output({ ok: true, revision: workspaceRevision(workspace), trees }, `${trees.length} tree(s) at revision ${workspaceRevision(workspace)}`);
    return;
  }

  if (resource === "node" && action === "update") {
    const engine = await createEngine();
    const command = {
      commandId: flags["command-id"] || randomUUID(),
      type: "node.update",
      label: "Update node from CLI",
      expectedRevision: parseExpectedRevision(),
      payload: {
        treeId: requireFlag("tree"),
        nodeId: requireFlag("node"),
        field: requireFlag("field"),
        value: requireFlag("value")
      }
    };
    const result = await engine.execute(command, { dryRun: Boolean(flags["dry-run"]) });
    output({ ok: true, commandId: command.commandId, ...result }, `${result.dryRun ? "Previewed" : "Applied"} ${command.type} at revision ${result.revision}`);
    return;
  }

  if (resource === "apply") {
    const engine = await createEngine();
    const command = JSON.parse(await fs.readFile(requireFlag("command"), "utf8"));
    const result = await engine.execute(command, { dryRun: Boolean(flags["dry-run"]) });
    output({ ok: true, commandId: command.commandId, ...result }, `${result.dryRun ? "Previewed" : "Applied"} ${command.type} at revision ${result.revision}`);
    return;
  }

  const error = new Error("Unknown command. Use validate, tree list, node update, or apply.");
  error.code = "COMMAND_UNKNOWN";
  throw error;
};

run().catch((error) => {
  const payload = {
    ok: false,
    error: {
      code: error.code || "UNEXPECTED_ERROR",
      message: error.message,
      details: error.details || null
    }
  };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = error.code === "REVISION_CONFLICT" ? 3 : 1;
});
