# P46 - Module Contracts and Acceptance

Status: PASS
Date: 2026-07-18
Build: `3C.14d.2`

## Result

P46 turns the target modular architecture into executable boundaries. The
repository now has eight machine-readable module charters, 14 versioned public
contracts and one neutral result envelope. All 21 interactions discovered in
P45 point to a named target contract.

The charters live in `architecture/modules/`. They state what each module owns,
what it must not own, its invariants, allowed and forbidden dependencies, public
contract versions and independent acceptance command. Diagram Studio is
explicitly planned; it is not reported as implemented.

## Acceptance Evidence

Seven black-box suites execute in separate Node processes and use only the
declared public surface:

| Module | Evidence |
| --- | --- |
| Semantic Kernel | activation, validation, idempotency and exact downgrade |
| Definition Runtime | immutable Goal Tree, CRT and EC capability lookup |
| Application | atomic command, idempotency, revision conflict and Undo/Redo |
| Workspace | canonical sessions, concurrent deduplication, isolation and close |
| Layout | immutable input, deterministic output and valid geometry |
| View | independent views, projection, selection and stable errors |
| Adapters | CLI process boundary, JSON result and serialized error code |

Run the evidence with:

```bash
npm run test:module-contracts
npm run test:modules
```

`test:module-contracts` also runs inside `test:architecture`, so a missing
charter, unmapped interaction, invalid dependency or unversioned public contract
cannot enter silently.

## Discovery

The first Layout UAT exposed an implicit wall-clock dependency: two equivalent
runs differed only in generated timestamps. P46 resolved `U011` by accepting an
explicit timestamp in the layout request while preserving the real-time default
for normal application use.

`U008` and `U009` remain visible migration inputs. Stable provider-owned errors
are now specified, but full adapter migration belongs to P58. Browser globals
are mapped to View and Definition contracts, but their removal belongs to P61
and P62. P46 defines and verifies the boundary without pretending the physical
extraction is already complete.

## Delivery Metrics

Final runtime effort was `233,658` tokens over 549 seconds. The package closed
at `52.7%` weighted project scope after revising the nearest comparable package,
P47, from its preserved `25k` baseline to a `75k` forecast.
