# Definition Tooling and Migrations - P51

Build: `3C.15d`  
Package: `P51`  
Status: PASS

## Delivered Contracts

`definition.migrations.v1` compares two securely loaded packages with the same
definition ID and produces a deterministic immutable pin-migration plan. It
classifies no-op, compatible and breaking changes; changed content requires a
higher version, while breaking semantic changes require a higher major version
and explicit approval.

Apply revalidates the plan against both exact packages and the current source
pin. It returns a target pin and deterministic receipt. Rollback succeeds only
when the current pin still equals the receipt target. These operations are pure:
they do not own a workspace transaction or write a file.

`definition.tooling.v1` and `adapters.definition-cli.v1` expose:

- package inspect, verify and exact pin;
- deterministic package-library listing with per-package diagnostics;
- definition comparison and migration preview;
- guarded migration apply and rollback;
- JSON output, stable error codes and documented exit statuses.

## Evidence

- Migration contract tests: compatible, breaking, no-op, semver rejection,
  explicit approval, tampered plans, stale pins and rollback receipts: PASS.
- Definition CLI process UAT: inspect, verify, pin, list, preview, apply,
  rollback, partial library and safe JSON errors: PASS.
- Definition Runtime and Adapters black-box module acceptance: PASS.
- Architecture inventory: 40 owned sources, 34 cross-module imports and 23
  explicit/debt interactions: PASS.
- Full headless prototype regression including semantic, layout and existing
  workspace CLI journeys: PASS.

## Safety Boundary

The CLI never writes a workspace, definition, pin or receipt. `apply` returns a
transition value for redirection or future use. P63 Workspace UX must commit a
definition pin through a revision-aware Workspace/Application transaction; it
must not move that responsibility into Definition Runtime.

## Traceability

P51 used `334,018` incremental runtime-reported tokens against a revised `400k`
forecast (`-16.5%`). No unrelated UI estimate was recalibrated. Completing P51
moves weighted known-scope progress to `66.6%`.

Next: `P52`, atomic copy and paste of n-ary subgraphs.
