# LTP Workbench - Strict Modular Architecture

Status: normative baseline, introduced 2026-07-17.

## Purpose

LTP Workbench is a strict modular monolith. A module is independently testable
and replaceable behind a public contract, even when modules run in one process.
The objective is not to prevent every cross-module effect. It is to make every
effect explicit, versioned and detected automatically.

No module may reach into another module's private state. Cross-module work uses
commands, queries, immutable values or declared ports.

## Target Modules

### 1. Semantic Kernel

Owns elements, n-ary relations, assumptions, derivations, semantic identities,
logic combinations and domain invariants.

Public contract:

- semantic graph schema;
- validation result and stable error codes;
- deterministic render projection;
- domain operations expressed through application commands.

Forbidden dependencies: Electron, renderer, workspace repository and layout
engine. Current implementation is spread across `semantic-*` modules and
`semantic-contract/v0.1/`.

### 2. Definition Runtime

Owns loading, canonical serialization, hashing, validation, version pinning,
capability negotiation and compilation of `diagram-definition.json` packages.

Public contract:

- `loadDefinition(source) -> LoadedDefinition`;
- `validateDefinition(candidate) -> diagnostics`;
- `compileDefinition(definition) -> DiagramCapabilities`;
- migration preview, apply and rollback contracts.

It accepts declarative data only. Official and user definitions use this exact
runtime. The current hardcoded `diagram-registry.js` is transitional.

### 3. Application

Owns commands, queries, transaction boundaries, optimistic concurrency,
idempotency, Undo/Redo, actor context and future permission checks.

Public contract:

- versioned command envelope;
- query API returning immutable snapshots or read models;
- structured results and errors;
- atomic batch command for complete subgraphs.

Electron, CLI and agents depend on this contract. They never bypass it.

### 4. Workspace

Owns project sessions, canonical locators, persistence, migrations, locking,
recovery and isolation between projects.

Public contract:

- open, list and close sessions;
- load and commit snapshots through revision-aware ports;
- project manifest and multi-file repository contract;
- migration diagnostics and rescue mode.

Workspace does not decide semantic validity beyond invoking the kernel through
an injected validation port.

### 5. Layout

Owns spatial compilation, layout engine invocation, route projection, quality
metrics and deterministic geometry validation.

Public contract:

```text
DiagramSnapshot + CompiledDefinition + LayoutRequest
  -> LayoutGraph
  -> LayoutEngine
  -> VisualLayout
```

`LayoutGraph` contains neutral nodes, groups, edges, ports, ranks, constraints
and previous positions. Engine adapters do not know workspaces, diagrams or UI.
ELK is one adapter; another engine can be tested against the same contract.

### 6. View

Owns document/view identity, focus, zoom, pan, selection, keyboard scopes,
hints, panel state and projection of a `VisualLayout` into UI-ready read models.

Public contract:

- immutable view state transitions;
- canvas projection queries;
- interaction intents translated into application commands;
- no persisted semantic mutation.

DOM rendering and Electron IPC are adapters around this module. The current
`renderer/app.js` is transitional and must be decomposed incrementally.

### 7. Adapters

Adapters translate external protocols into application calls:

- Electron main/preload/renderer;
- CLI JSON;
- Markdown and future import/export formats;
- future MCP and LLM integrations.

Adapters may depend inward. No inner module may import an adapter. LLM access is
always scoped to a workspace, document set, actor and permission policy.

### 8. Diagram Studio

Diagram Studio is a separate product surface over Definition Runtime. It edits
the same package format consumed by CLI and application. It does not own a
second semantic model and does not generate privileged source code.

## Dependency Rules

Allowed direction:

```text
Electron / CLI / MCP / Studio
              |
              v
         Application <---- View intents
          /   |   \
         v    v    v
    Kernel  Workspace  Layout
       ^                 ^
       |                 |
       +-- Definition ---+
```

Rules:

1. Dependencies point inward; composition occurs in adapters.
2. Domain and definition modules contain no UI or filesystem behavior.
3. Repository implementations depend on repository ports, not transaction
   internals.
4. View state never participates in semantic validation or content Undo/Redo.
5. Layout receives explicit document IDs and neutral snapshots.
6. Cross-module data is validated at entry and treated as immutable.
7. Public contracts use stable error codes, not parsed error messages.
8. Contract changes require compatibility tests and an explicit version rule.
9. No shared `utils` dumping ground; shared code must have one named purpose.

## Source and File Policy

Single Responsibility Principle is mandatory.

- Preferred production file size: 50-200 lines.
- Review threshold: 250 lines.
- Maximum for a new production file: 300 lines.
- Tests and generated fixtures should also be split by capability.
- A module may use several small files behind one public `index` or facade.
- A file over the review threshold needs a documented reason or extraction.

Legacy no-growth budgets are enforced automatically for current oversized
files. They may shrink, but not grow. When feature work touches one, first
extract the relevant responsibility unless an urgent defect makes that unsafe.

Known extraction targets:

1. `renderer/app.js`: view store, application client, interactions, hints,
   assumptions, frame workflows, renderers and test drivers.
2. `renderer/styles.css`: shell, canvas, entities, links, overlays and panels.
3. `core/composed-layout.js`: compiler, hierarchy, candidate scoring, routing,
   geometry validation and orchestration.
4. `core/command-registry.js`: elements, relations, assumptions, frames and
   collective operations.
5. `main.js`: composition root, workspace IPC, fixtures and test harness.

## Module Test Contract

Each module has four test layers:

1. Unit: internal algorithms and edge cases.
2. Contract: provider/consumer schema, errors and compatibility.
3. Module acceptance: black-box journeys through only the public API.
4. System UAT: selected workflows crossing modules and real adapters.

Module acceptance suites must include:

- deterministic fixture inputs and canonical outputs;
- negative cases and invariant violations;
- round trips where serialization exists;
- compatibility with the previous supported contract version;
- no hidden dependency on Electron, DOM, current working directory or time;
- performance budgets where graph size or file size matters.

A module is complete only when its acceptance suite passes independently. A
system UAT cannot substitute for missing module tests.

## Iteration Policy

Every feature follows this loop:

1. Establish or verify a compiling, runnable baseline.
2. Define one small contract or behavioral increment.
3. Implement it with unit, contract and module acceptance tests.
4. Run affected module suites and architecture gates.
5. Run selected cross-module UATs.
6. Commit only a coherent, reversible increment.

After 3-4 feature increments, schedule a behavior-preserving refactor. The
refactor must improve boundaries, naming, duplication or file size and must pass
the same acceptance evidence before and after.

## Current Violations and Treatment

The repository is functional but not yet compliant with the target structure:

- renderer performs some direct compatibility mutations;
- layout coordinator reads workspace and diagram definitions directly;
- command handlers share one large registry;
- repository imports revision logic from the transaction engine;
- official definitions remain hardcoded;
- Electron main includes test and fixture responsibilities.

These are migration inputs, not reasons for a rewrite. Extraction proceeds one
contract at a time, preserving behavior and keeping the application runnable.

## Modularization Sequence

1. Context, normative architecture and automatic architecture gate.
2. Inventory every public and implicit cross-module interaction.
3. Define module charters, ports, schemas and acceptance fixtures.
4. Complete Definition Runtime (`3C.15`) behind a versioned contract.
5. Introduce an Application facade and remove direct renderer writes.
6. Extract neutral LayoutGraph compilation and engine contracts.
7. Split View state, interaction controllers and render components.
8. Introduce project-folder, tabs and windows through Workspace/View contracts.
9. Add MCP/LLM as a permission-scoped adapter only after those gates pass.

No large-bang rewrite is permitted. Each extraction ends with a green build,
module acceptance evidence and unchanged system behavior.
