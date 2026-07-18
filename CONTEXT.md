# LTP Workbench - Session Context

Updated: 2026-07-18
Current build: `3C.15d` - Definition Tooling and Migrations
Architecture: strict modular monolith with a headless core
Current scope progress: `66.6%` estimated weighted scope

Read this file at the start of every long AI session. It is the short recovery
point for the project. `ARCHITECTURE.md` is the normative design document;
`outputs/Plan-Status.md` is the generated delivery roadmap,
`outputs/Interface-Improvement-Plan.md` retains the requirements narrative, and
`outputs/Scope-Effort-Baseline.md` defines its weighted progress baseline.

## Product

LTP Workbench is a keyboard-first desktop application for William Dettmer's
Logical Thinking Process. It must support Goal Tree, CRT, FRT, EC, PrT and TrT
without implementing each diagram as a separate hardcoded application.

Long-term requirements include local projects, multiple documents and views,
headless automation, and optional LLM assistance. Electron, CLI and future MCP
or LLM adapters must use the same application service and domain rules.

Repository: `jax-101/ltp-workbench`
Active development branch: `iteration-3c-minimized-frames`

## Architecture

The target is a strict modular design, not microservices. Modules remain in one
repository and usually one process, but communicate only through explicit,
versioned contracts.

Target modules:

1. Semantic Kernel: elements, n-ary relations, assumptions, derivations and
   domain invariants.
2. Definition Runtime: load, validate, version and compile declarative diagram
   packages.
3. Application: commands, queries, transactions, Undo/Redo and authorization.
4. Workspace: sessions, migrations, persistence and project isolation.
5. Layout: neutral LayoutGraph compiler, engine adapters, routing and scoring.
6. View: document/view state, canvas projection, selection and interaction.
7. Adapters: Electron IPC, CLI, future MCP/LLM and import/export.
8. Diagram Studio: editor for the same definition format consumed by CLI.

Dependency direction and module contracts are defined in `ARCHITECTURE.md`.
Goal Tree, CRT, FRT and EC are definition packages, not independent code paths.

## Current Structure

- `src/core/`: headless domain, application, workspace and layout code.
- `semantic-contract/v0.1/`: executable semantic vocabulary and oracle fixtures.
- `architecture/modules/`: machine-readable charters and public contract catalog.
- `architecture/contracts/`: shared versioned contract schemas.
- `definition-contract/v1/`: executable diagram-definition schema and golden identity fixture.
- `src/core/definition-runtime/`: artifact identity, confined package loading, resource policy, pins and rescue resolution.
- `diagram-definitions/official/`: securely loaded Goal Tree, CRT and multipartite EC packages and semantic oracles.
- `src/generated/official-diagram-registry.js`: deterministic compatibility projection compiled from official packages.
- `scripts/definition-cli.js`: headless package inspection and exact pin-migration adapter.
- `src/main.js` and `src/preload.js`: Electron adapter and IPC composition.
- `src/renderer/`: current UI and interaction layer.
- `scripts/ltp-cli.js`: headless CLI adapter.
- `outputs/`: plans, decisions, lessons, fixtures and test evidence.

Known modularity debt:

- `src/renderer/app.js` mixes view state, interaction, rendering and workflows.
- `src/renderer/styles.css` is a monolithic stylesheet.
- `src/core/composed-layout.js` mixes compilation, placement, routing and score.
- `src/core/command-registry.js` contains handlers for several capabilities.
- `src/main.js` mixes composition, fixture support and visual test orchestration.
- Browser consumers still receive compiled definitions through ordered global scripts.

These legacy files are under a no-growth architecture ratchet. Do not extend
them casually; extract the touched responsibility behind a small public API.

## Technologies

Declared and installed versions:

- JavaScript, CommonJS modules; no TypeScript and no frontend framework.
- Node.js observed development runtime: `25.8.0`.
- npm observed development runtime: `11.12.1`.
- Electron: `31.7.7`.
- electron-builder: `24.13.3`.
- elkjs: `0.11.1`.
- immer: `10.2.0`.
- proper-lockfile: `4.1.2`.
- ajv: `8.20.0`.
- HTML and CSS for the renderer.

WebCola and its D3 dependencies may exist locally from an experiment, but are
not declared project dependencies and are not part of the active architecture.

## Engineering Rules

- One reason to change per module or source file.
- Target 50-200 lines for production files; review before exceeding 250.
- New production files may not exceed 300 lines.
- Existing oversized files may shrink but may not grow.
- Prefer pure functions. Use classes only for genuinely stateful services.
- `src/core/` must not import Electron, DOM, renderer or CSS code.
- UI, CLI and agents must not mutate workspace JSON directly.
- All writes use application commands with command ID and expected revision.
- Domain state, persisted layout, view state and ephemeral interaction state
  remain distinct.
- Layout consumes a neutral contract and must not branch on concrete diagram
  names.
- Diagram definitions contain declarative data, never arbitrary JavaScript.
- Official and user definitions pass through the same loader and validator.
- Public contracts define inputs, outputs, errors, invariants and versions.
- Use focused fixtures; keep tests deterministic and independent of the mouse.
- Do not change behavior during an extraction refactor.

## Iteration Workflow

1. Solid base: establish the smallest compiling and running structure.
2. Micro-step: implement one capability or one contract change at a time.
3. Automatic validation: unit, contract and module acceptance tests before the
   next step, followed by system UAT where appropriate.
4. Guided refactor: after every 3-4 feature micro-steps, stop and reduce debt
   without changing behavior.

At the end of each development step, update `planning/work-packages.json`, run
`npm run scope:status` and report the weighted scope percentage. New accepted
scope must be added explicitly so changes to the denominator remain visible.
Every stopping update also reports the current build, active or completed work
package, package state and next package in the general roadmap.
Record runtime-reported usage in `planning/effort-log.json`; never substitute
an estimate for an unavailable actual. Register discoveries in
`planning/unknowns.json` before converting them into work packages.

Every module requires:

- a short charter and public API;
- owned data and invariants;
- allowed dependencies;
- unit tests;
- consumer/provider contract tests;
- black-box module acceptance tests;
- negative, compatibility and deterministic fixtures.

## Current Status

Working:

- Transactional command engine with optimistic revisions and atomic Undo/Redo.
- Semantic kernel and additive migration for Goal Tree, CRT and EC.
- N-ary relations, projected junctions, conflicts, assumptions and derivations.
- Workspace sessions with isolated revisions and independent document views.
- Headless CLI using the same transaction engine.
- ELK layered composed layout, frames, curved routing and visual transitions.
- Keyboard-first navigation, hints, multi-selection and Assumption Workbench.
- Automated core, semantic, layout, randomized, visual and shortcut suites.
- Executable ownership, cross-module import, browser-global and IPC inventory.
- Eight machine-readable module charters and 16 versioned public contracts.
- Seven independent black-box module acceptance suites; Diagram Studio remains planned.
- Canonical 16-stage roadmap with an exact generated Markdown projection.
- GitHub CI blocks functional regression until architecture and module UAT pass.
- Definition artifact v1 rejects executable/non-JSON values and produces immutable content-addressed definitions.
- Directory and embedded definitions use one confined, resource-bounded loader with exact pins and read-only rescue.
- Goal Tree, CRT and multipartite EC compile from v1 packages with exact semantic and legacy behavior parity.
- Definition migrations provide deterministic preview/apply/rollback pin transitions with semver and breaking-change guards.
- The CLI inspects, verifies, pins, lists and compares packages without mutating workspaces.

Next architectural work:

- Implement atomic copy/paste of complete n-ary subgraphs in P52.
- Extract a neutral layout compiler from `composed-layout.js`.
- Move remaining renderer mutations behind application commands.
- Split renderer state, interaction, projection and rendering.
- Add real project-folder, tab, multi-window and view synchronization UI.
- Add MCP/LLM only as a permission-scoped application adapter.

## Verification

Run before publishing a change:

```bash
npm run test:architecture
npm run test:contracts
npm run test:module-contracts
npm run test:modules
npm run test:definition
npm run test:definition-loader
npm run test:official-definitions
npm run test:definition-migrations
npm run test:definition-cli
npm run test:plan
npm run test:ci
npm run scope:status
npm run test:prototype -- --no-smoke
npm run smoke
npm run test:visual
npm run test:shortcuts
```

Relevant references:

- `ARCHITECTURE.md`
- `outputs/Diagram-Architecture-Assessment.md`
- `outputs/Headless-Architecture.md`
- `outputs/Multi-Project-Architecture.md`
- `outputs/Interface-Improvement-Plan.md`
- `outputs/Scope-Effort-Baseline.md`
- `outputs/Module-Interaction-Inventory.md`
- `outputs/Module-Contracts-and-Acceptance-P46.md`
- `outputs/Plan-Normalization-and-CI-P47.md`
- `outputs/Definition-Artifact-P48.md`
- `outputs/Secure-Definition-Loader-P49.md`
- `outputs/Official-Definitions-P50.md`
- `outputs/Definition-Tooling-P51.md`
- `outputs/Plan-Status.md`
- `outputs/Decision-Log.md`
- `outputs/Engineering-Lessons-Log.md`
