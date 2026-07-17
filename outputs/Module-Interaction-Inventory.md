# Module Interaction Inventory

Updated: 2026-07-18  
Build: `3C.14c.2e`  
Work package: `P45`  
Canonical data: `architecture/interaction-inventory.json`

## Result

The current runtime has:

- 26 source entry files with an explicit current owner;
- 32 direct imports that cross module ownership;
- 3 browser-global dependencies declared through HTML script order;
- 17 Electron bridge methods matched to 17 main-process handlers;
- 21 interaction contracts or debts;
- 1 explicit boundary, 8 implicit boundaries and 12 debts.

This is an inventory of the current system, not a claim that the current
structure already complies with the target architecture. Every runtime source,
cross-module import, browser-global dependency and IPC method is now either
attached to a declared interaction or causes `npm run test:contracts` to fail.

## Current Ownership

| Module | Current implementation | Condition |
| --- | --- | --- |
| Semantic Kernel | semantic validation, lifecycle, migration and render projection | Migration and projection still consume workspace-shaped data |
| Definition Runtime | hardcoded diagram registry | Transitional debt until `3C.15` |
| Application | transaction engine, command registry and shared error | Commands work; facade and module-owned errors are missing |
| Workspace | manager, repository, migrations and workspace validation | Depends back on Application in two places |
| Layout | composed layout, presentation constraints, ELK adapter and random fixture | Compiler, routing, scoring and orchestration remain combined |
| View | document/view helpers, selection model and command configuration | Most state and interactions remain inside renderer/app.js |
| Adapters | Electron main/preload/renderer, CLI and Markdown export | Renderer and CLI bypass the future Application facade |
| Diagram Studio | no runtime files | Planned after Definition Runtime |

`src/renderer/app.js` is assigned to Adapters for the current map, with target
ownership split between View and Adapters. This prevents pretending the split
already exists while preserving a single owner for automated dependency checks.

## Interaction Register

| ID | Direction | State | Current boundary | Formalization |
| --- | --- | --- | --- | --- |
| C001 | Adapters -> Application | Implicit | Commands, revision and history through direct API/IPC | P46, P58 |
| C002 | Adapters -> Workspace | Implicit | Sessions, snapshots and persistence | P46, P63 |
| C003 | Application -> Semantic | Implicit | Semantic commands, lifecycle and projection | P46, P48, P58 |
| C004 | Application -> Definition | Debt | Hardcoded capability lookup | P48-P50 |
| C005 | Application -> Workspace | Implicit | Validator import and injected persistence callback | P46, P58 |
| C006 | Workspace -> Semantic | Implicit | Direct migration and validation imports | P46, P48, P49 |
| C007 | Adapters -> View | Implicit | Document and view helper imports | P46, P61 |
| C008 | Adapters -> Layout | Implicit | Layout execution and geometry validation | P46, P59, P60 |
| C009 | Layout -> Definition | Debt | Hardcoded layout capability lookup | P48, P50, P59 |
| C010 | Adapter -> Adapter | Explicit | Context bridge and request-response IPC | P46, P58 |
| C011 | Adapter -> Definition | Debt | Browser-global diagram registry loaded by script order | P46, P48, P61, P62 |
| C012 | Adapter -> View | Implicit | Browser-global selection and command helpers | P46, P61, P62 |
| D001 | Layout -> View | Debt | Layout imports document-selection helpers | P59, P61 |
| D002 | Workspace -> Application | Debt | Workspace Manager constructs TransactionEngine | P46, P58 |
| D003 | Workspace -> Application | Debt | Repository imports workspaceRevision | P46, P58 |
| D004 | Inner modules -> Application | Debt | Shared ownership of LtpError | P46, P58 |
| D005 | CLI -> Workspace | Debt | CLI imports repository, validator and migrations | P46, P58 |
| D006 | Renderer -> Application | Debt | Whole-workspace compatibility replacement | P58, P61 |
| D007 | Adapter -> Layout | Debt | Layout accepts and returns the complete workspace | P59, P60 |
| D008 | Electron main -> Layout/tests | Debt | Fixture and visual-test orchestration in production root | P47, P58, P62 |
| D009 | CLI -> Semantic | Debt | CLI imports semantic migration implementation | P48, P51, P58 |

The machine-readable entry for each interaction additionally records its data,
known error codes or error leaks, mechanism and formalization packages.

## Critical Flows

### Semantic command

```text
Renderer -> preload IPC -> Electron main -> TransactionEngine
  -> command handler -> Semantic Kernel -> workspace validation
  -> persistence callback -> repository
```

The transaction boundary is sound, but Electron and CLI do not consume one
versioned Application facade. The repository and manager also depend back on
Application helpers, forming an ownership cycle.

### Layout

```text
Renderer -> preload IPC -> Electron main -> composed-layout
  -> hardcoded definition registry -> ELK adapter -> cloned workspace
```

The ELK adapter is isolated. The surrounding coordinator is not: it imports a
View helper, reads diagram definitions directly and owns a full workspace
instead of consuming `LayoutGraph` and returning `VisualLayout`.

### Workspace open and commit

```text
Adapter -> WorkspaceManager -> migration -> semantic migration
  -> TransactionEngine -> repository lock -> atomic file replacement
```

Persistence behavior is robust, but the direction between Workspace and
Application is not yet stable. P46 must choose ports before any extraction.

### View state

```text
Renderer local state -> save-view IPC -> application command -> workspace
```

Persisted view state uses a command, while many transient selections,
interaction scopes and render projections remain mixed in renderer/app.js.

## Findings

1. **Application and Workspace form a cycle.** Application imports workspace
   validation; Workspace constructs TransactionEngine and imports its revision
   helper. P46 must define repository, validation and revision ports before P58.
2. **Layout has two forbidden dependencies.** It imports View document helpers
   and the hardcoded Definition registry. P59 needs explicit document identity
   and compiled capabilities as inputs.
3. **Adapters have no single facade.** Electron main and CLI import several
   implementations. This is the highest-risk source of behavioral divergence.
4. **Error ownership is ambiguous.** Semantic, Workspace and View import an
   Application-owned error class. Stable module errors and adapter
   serialization must be specified together.
5. **The Electron bridge is enumerable but unversioned.** Method/channel parity
   is now tested, but request, response and error schemas need P46 contracts.
6. **Whole-workspace values cross too many boundaries.** Renderer compatibility
   writes and layout output both use a complete workspace, obscuring ownership.
7. **Test orchestration changes the production composition root.** Environment
   branches and fixtures belong behind dedicated test adapters.
8. **Three module dependencies are hidden in HTML order.** The renderer receives
   Definition and View APIs as globals rather than imports or injected ports.
   Their order is now tested, but P46 must define the consumer contracts.

## P46 Handoff

P46 should formalize contracts in this order:

1. Common result/error envelope and serialization rules.
2. Application command/query facade used by Electron and CLI.
3. Workspace repository, validation, revision and migration ports.
4. Semantic Kernel validation, projection and migration ports.
5. Neutral Layout request/result and compiled definition input.
6. View state, projection and interaction-intent contracts.
7. Electron IPC schemas as an adapter compatibility suite.

No structural extraction should begin until the consumer/provider fixtures for
the relevant interaction pass. P45 intentionally changes no product behavior.

## Verification

```bash
npm run test:contracts
npm run test:architecture
```

The first command compares the live source and IPC graph with the inventory.
Adding, deleting or redirecting a cross-module dependency requires an explicit
inventory decision instead of silently changing the architecture.
