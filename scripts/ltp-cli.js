#!/usr/bin/env node

const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { TransactionEngine, workspaceRevision } = require("../src/core/transaction-engine");
const { WorkspaceRepository } = require("../src/core/workspace-repository");
const { validateWorkspace } = require("../src/core/workspace-validator");
const { migrateWorkspace } = require("../src/core/workspace-migrations");
const { addSemanticKernel } = require("../src/core/semantic-migration");
const { runDefinitionCommand } = require("./definition-cli");

const SEMANTIC_TYPE_BY_NODE_TYPE = Object.freeze({
  entity: "ENTITY",
  ude: "UDE",
  rootCause: "ROOT_CAUSE",
  criticalRootCause: "CRITICAL_ROOT_CAUSE",
  objective: "OBJECTIVE",
  need: "NEED",
  want: "WANT",
  injection: "INJECTION"
});

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

const readWorkspace = async () => migrateWorkspace(JSON.parse(await fs.readFile(requireFlag("workspace"), "utf8"))).workspace;

const createEngine = async () => {
  const workspacePath = requireFlag("workspace");
  const repository = new WorkspaceRepository(workspacePath);
  const migration = migrateWorkspace(await repository.read());
  const workspace = migration.changed ? await repository.reset(migration.workspace) : migration.workspace;
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

const parseIdList = (name) => requireFlag(name)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const executeAndOutput = async (engine, command) => {
  const result = await engine.execute(command, { dryRun: Boolean(flags["dry-run"]) });
  output({ ok: true, commandId: command.commandId, ...result }, `${result.dryRun ? "Previewed" : "Applied"} ${command.type} at revision ${result.revision}`);
};

const run = async () => {
  const [resource, action] = positional;

  if (resource === "definition") {
    const result = await runDefinitionCommand(positional.slice(1), flags);
    output(result.payload, result.humanText);
    if (result.exitCode) process.exitCode = result.exitCode;
    return;
  }

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
      frames: workspace.canvases.find((canvas) => canvas.id === tree.canvasId)?.frames.filter((frame) => frame.treeId === tree.id).length || 0,
      links: tree.links.length
    }));
    output({ ok: true, revision: workspaceRevision(workspace), trees }, `${trees.length} tree(s) at revision ${workspaceRevision(workspace)}`);
    return;
  }

  if (resource === "semantic" && action === "preview") {
    const workspace = await readWorkspace();
    const migration = addSemanticKernel(workspace);
    const trees = migration.workspace.trees
      .filter((tree) => tree.semanticKernel)
      .map((tree) => ({
        id: tree.id,
        profile: tree.semanticKernel.diagramType || tree.semanticKernel.profile,
        storageMode: tree.semanticKernel.storageMode || "LEGACY_PROJECTION",
        kernelVersion: tree.semanticKernel.kernelVersion,
        sourceFingerprint: tree.semanticKernel.sourceFingerprint,
        elements: tree.semanticKernel.elements.length,
        relations: tree.semanticKernel.relations.length,
        assumptions: tree.semanticKernel.assumptions.length,
        annotations: (tree.semanticKernel.annotations || []).length
      }));
    output(
      { ok: true, changed: migration.changed, persisted: false, migratedTreeIds: migration.migratedTreeIds, trees },
      `Previewed semantic migration for ${trees.length} tree(s); no files changed`
    );
    return;
  }

  if (resource === "semantic" && action === "show") {
    const workspace = await readWorkspace();
    const treeId = requireFlag("tree");
    const tree = workspace.trees.find((candidate) => candidate.id === treeId);
    if (!tree) {
      const error = new Error(`Tree ${treeId} was not found`);
      error.code = "TREE_NOT_FOUND";
      throw error;
    }
    if (!tree.semanticKernel) {
      const error = new Error(`Tree ${treeId} has no semantic kernel`);
      error.code = "SEMANTIC_KERNEL_MISSING";
      throw error;
    }
    output(
      {
        ok: true,
        revision: workspaceRevision(workspace),
        treeId,
        storageMode: tree.semanticKernel.storageMode || "LEGACY_PROJECTION",
        graph: tree.semanticKernel,
        renderProjection: tree.renderProjection || null
      },
      `${tree.semanticKernel.diagramType || tree.semanticKernel.profile}: ${tree.semanticKernel.elements.length} elements, ${tree.semanticKernel.relations.length} relations, ${tree.semanticKernel.assumptions.length} assumptions`
    );
    return;
  }

  if (resource === "assumption" && action === "list") {
    const workspace = await readWorkspace();
    const treeId = requireFlag("tree");
    const tree = workspace.trees.find((candidate) => candidate.id === treeId);
    if (!tree) {
      const error = new Error(`Tree ${treeId} was not found`);
      error.code = "TREE_NOT_FOUND";
      throw error;
    }
    if (!tree.semanticKernel) {
      const error = new Error(`Tree ${treeId} has no semantic kernel`);
      error.code = "SEMANTIC_KERNEL_MISSING";
      throw error;
    }
    const relationId = flags.relation === true ? null : flags.relation;
    const status = flags.status === true ? null : flags.status?.toUpperCase();
    const assumptions = tree.semanticKernel.assumptions.filter((assumption) =>
      (!relationId || assumption.subject?.relationId === relationId)
      && (!status || (assumption.status || "DRAFT") === status)
    );
    output({ ok: true, revision: workspaceRevision(workspace), treeId, assumptions }, `${assumptions.length} assumption(s)`);
    return;
  }

  if (resource === "assumption" && action === "create") {
    const engine = await createEngine();
    const treeId = requireFlag("tree");
    const relationId = requireFlag("relation");
    const tree = engine.getSnapshot().trees.find((candidate) => candidate.id === treeId);
    const relation = tree?.semanticKernel?.relations.find((candidate) => candidate.id === relationId);
    if (!relation) {
      const error = new Error(`Relation ${relationId} was not found`);
      error.code = "SEMANTIC_RELATION_NOT_FOUND";
      throw error;
    }
    const kind = flags.scope && flags.scope !== true ? String(flags.scope).toUpperCase() : relation.type === "CONFLICT" ? "CONFLICT" : "RELATION";
    const subject = { kind, relationId };
    if (["INPUT", "OUTPUT"].includes(kind)) subject.elementId = requireFlag("element");
    const command = {
      commandId: flags["command-id"] || randomUUID(),
      type: "semantic.assumption.create",
      label: "Create assumption from CLI",
      expectedRevision: parseExpectedRevision(),
      payload: {
        treeId,
        assumption: {
          id: flags.id && flags.id !== true ? flags.id : randomUUID(),
          statement: requireFlag("statement"),
          status: flags.status && flags.status !== true ? flags.status : "DRAFT",
          subject
        }
      }
    };
    await executeAndOutput(engine, command);
    return;
  }

  if (resource === "assumption" && action === "update") {
    const engine = await createEngine();
    const command = {
      commandId: flags["command-id"] || randomUUID(),
      type: "semantic.assumption.update",
      label: "Update assumption from CLI",
      expectedRevision: parseExpectedRevision(),
      payload: {
        treeId: requireFlag("tree"),
        assumptionId: requireFlag("assumption"),
        field: requireFlag("field"),
        value: requireFlag("value")
      }
    };
    await executeAndOutput(engine, command);
    return;
  }

  if (resource === "assumption" && action === "status") {
    const engine = await createEngine();
    const command = {
      commandId: flags["command-id"] || randomUUID(),
      type: "semantic.assumptions.update-status",
      label: "Update assumption status from CLI",
      expectedRevision: parseExpectedRevision(),
      payload: {
        treeId: requireFlag("tree"),
        assumptionIds: parseIdList("assumption"),
        status: requireFlag("status")
      }
    };
    await executeAndOutput(engine, command);
    return;
  }

  if (resource === "assumption" && action === "delete") {
    const engine = await createEngine();
    const command = {
      commandId: flags["command-id"] || randomUUID(),
      type: "semantic.assumptions.delete",
      label: "Delete assumptions from CLI",
      expectedRevision: parseExpectedRevision(),
      payload: { treeId: requireFlag("tree"), assumptionIds: parseIdList("assumption") }
    };
    await executeAndOutput(engine, command);
    return;
  }

  if (resource === "node" && action === "update") {
    const engine = await createEngine();
    const treeId = requireFlag("tree");
    const tree = engine.getSnapshot().trees.find((candidate) => candidate.id === treeId);
    if (!tree) {
      const error = new Error(`Tree ${treeId} was not found`);
      error.code = "TREE_NOT_FOUND";
      throw error;
    }
    const nativeSemantic = tree.semanticKernel?.storageMode === "NATIVE";
    const field = requireFlag("field");
    const rawValue = requireFlag("value");
    const command = {
      commandId: flags["command-id"] || randomUUID(),
      type: nativeSemantic ? "semantic.element.update" : "node.update",
      label: "Update node from CLI",
      expectedRevision: parseExpectedRevision(),
      payload: nativeSemantic
        ? {
            treeId,
            elementId: requireFlag("node"),
            field,
            value: field === "type" ? SEMANTIC_TYPE_BY_NODE_TYPE[rawValue] || rawValue : rawValue
          }
        : { treeId, nodeId: requireFlag("node"), field, value: rawValue }
    };
    await executeAndOutput(engine, command);
    return;
  }

  if (resource === "apply") {
    const engine = await createEngine();
    const command = JSON.parse(await fs.readFile(requireFlag("command"), "utf8"));
    await executeAndOutput(engine, command);
    return;
  }

  const error = new Error("Unknown command. Use definition, validate, tree list, semantic preview/show, assumption list/create/update/status/delete, node update, or apply.");
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
