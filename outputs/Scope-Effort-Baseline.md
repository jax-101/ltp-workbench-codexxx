# Scope and Effort Baseline

Updated: 2026-07-18  
Baseline build: `3C.14d.3`
Machine-readable register: `planning/work-packages.json`
Actual-effort ledger: `planning/effort-log.json`  
Unknown register: `planning/unknowns.json`

## Purpose

This baseline turns the current roadmap into weighted work packages so progress
can be reported as a percentage of known scope. The unit is **estimated working
tokens**: a planning proxy for the combined AI effort needed to inspect,
design, implement, test, debug and document a package.

These values are not measured API-token invoices. Historical per-iteration
token telemetry was not stored, so claiming exact consumption would be false.
The estimates are triangulated from the repository history and carry an
initial uncertainty of `+/-40%`. Relative weights are more useful than the
absolute token values.

Actual effort is kept separately and only accepts runtime-reported token
usage. An estimate, elapsed time or Git change volume is never relabeled as an
actual. The original estimate remains immutable; a revised estimate requires a
dated entry in `estimateRevisions` so calibration changes remain auditable.

## Method

The calibration baseline contains 73 commits and about 25,638 tracked lines.
Completed packages were compared using four signals:

1. Discovery and design burden, including semantic or UX research.
2. Change volume and number of files and boundaries touched.
3. Complexity premium for layout, semantic, persistence and architecture work.
4. Verification burden: unit, contract, randomized, visual and UAT evidence.

Historical anchors place a narrow UI behavior around `10k-20k`, a medium
cross-layer capability around `28k-55k`, a semantic or architectural vertical
slice around `70k-100k`, and the initial prototype at `130k`. Future packages
use the same scale and are compared with the nearest completed anchors.

Progress uses an earned-effort calculation:

```text
earned effort = sum(package estimate * package completion)
scope progress = earned effort / total estimated scope
```

Adding or removing scope changes the denominator. Estimates should be reviewed
after completing a package whenever actual complexity differs materially from
its calibration class.

## Current Position

| Measure | Value |
| --- | ---: |
| Known packages | 78 |
| Completed packages | 49 |
| Partially completed packages | 1 |
| Planned packages | 28 |
| Total estimated scope | 4,056,000 tokens |
| Earned effort | 2,212,750 tokens |
| Remaining effort | 1,843,250 tokens |
| **Weighted scope complete** | **54.6%** |

`P18` is credited at 85%; its remaining nested-frame optimization is represented
again only where it becomes distinct advanced layout work, avoiding double
counting. The next active package is `P48`, the definition schema, canonical
serialization and hash foundation for Definition Runtime.

## Portfolio View

| Portfolio | Packages | Estimate | Earned |
| --- | --- | ---: | ---: |
| Initial foundation | P00 | 130k | 130k |
| Iterations 1 through 3A | P01-P11 | 378k | 378k |
| Layout builds 3B | P12-P18 | 323k | 314.75k |
| Builds 3C through modular foundation | P19-P44 | 990k | 990k |
| Modular due diligence | P45-P47 | 360k | 360k |
| Definition Runtime | P48-P51 | 245k | 0 |
| Interaction backlog | P52-P54 | 82k | 0 |
| Frame focus | P55-P57 | 148k | 0 |
| Modular extraction | P58-P62 | 380k | 0 |
| Workspace UX | P63-P65 | 200k | 0 |
| Layout maturity | P66 | 75k | 0 |
| Diagram Studio | P67-P68 | 190k | 0 |
| Remaining official diagrams | P69-P71 | 180k | 0 |
| AI integration | P72-P74 | 235k | 0 |
| Product readiness | P75 | 100k | 0 |
| Scope governance | P76-P77 | 40k | 40k |

## Actual Effort

Historical per-package token telemetry was not retained. Consequently, 47
historical packages are explicitly marked unavailable rather than being given
reconstructed values. P45 is the first package with goal-backed measurement;
the current coverage and actual total are calculated by `scope:status`.

P45 closed at `237,419` actual tokens and 743 seconds against a `35,000`
baseline: `+202,419`, or `+578.3%` (`6.78x`). P46 closed at `233,658` tokens and
549 seconds against its `80,000` baseline: `+153,658`, or `+192.1%` (`2.92x`).
It landed 6.5% below its revised `250k` forecast. At P46 close, measurement
coverage was `2/49` started packages, with `471,077` actual tokens recorded.

Those first two architecture-governance observations revised only their nearest
comparables: P46 from `80k` to `250k`, and P47 from `25k` to `75k`. Unrelated
packages wait for measurements from their own implementation class.

P47 subsequently closed at `208,093` tokens and 560 seconds. That is `+183,093`
or `+732.4%` (`8.32x`) against its original `25k` baseline, and `+133,093` or
`+177.5%` (`2.77x`) against its revised `75k` forecast. Measurement coverage is
now `3/50` started packages, with `679,170` actual tokens recorded. P48 is a
Definition Runtime implementation package rather than architecture governance,
so this result does not revise it without comparable evidence.

For every subsequent package, cumulative runtime usage is recorded as an
append-only snapshot:

```bash
npm run scope:record-effort -- \
  --package P45 --status measured --tokens 42000 \
  --source codex-goal --note "Final runtime usage"
```

Allowed states are `tracking`, `partial`, `measured` and `unavailable`. A new
package cannot become partial or done without a tracking event or an explicit
unavailable event. `npm run scope:status -- --json` exposes the baseline,
current estimate, actual, absolute variance and percentage variance for every
package. Once measured packages exist, their actual-to-estimate ratio becomes
the calibration evidence for revising comparable future packages.

The preferred source is the final usage reported by a runtime goal associated
with exactly one active package. No artificial token budget is needed. If work
is split across runtimes, each source records a cumulative snapshot and the
final package measurement must state how the totals were reconciled.

## Unknowns

An unknown is retained even after resolution. Its lifecycle is `open`,
`assessed`, `converted`, `mitigated`, `resolved` or `deferred`. Conversion to
scope creates one or more work packages and records the exact tokens added to
the denominator from that point onward.

| ID | Discovery | State | Result |
| --- | --- | --- | --- |
| U001 | Semantic diversity across LTP diagrams | Converted | Semantic contract, declarative runtime and official packages |
| U002 | Projects, documents and synchronized views | Converted | Session foundation and workspace UX packages |
| U003 | Assumptions behind eligible lines | Resolved | Assumption lifecycle and Workbench |
| U004 | Oversized modules and implicit contracts | Converted | Modular due diligence and extraction packages |
| U005 | Nested-frame boundary behavior | Converted | Frame composition, focus, portals and advanced layout |
| U006 | Permissioned LLM integration | Converted | MCP/LLM adapter, UX and evaluations |
| U007 | Missing historical token telemetry | Mitigated | Actual-effort ledger and explicit unavailable state |
| U008 | Stable error ownership and adapter serialization | Assessed | Covered by P46 and P58 without adding scope |
| U009 | Browser globals and script-order dependencies | Assessed | Covered by P46, P61 and P62 without adding scope |
| U010 | Long-thread context overhead | Mitigated | P46 revised to 250k and P47 to 75k; broader recalibration deferred |
| U011 | Layout output depended on implicit wall clock | Resolved | Layout requests accept an explicit timestamp for deterministic acceptance |
| U012 | First hosted CI execution | Assessed | Local contract passes; first GitHub run pending observation |

Current register: 12 unknowns; five converted, three assessed, two mitigated and
two resolved. There are no untriaged open unknowns today. This does not
imply that future unknowns do not exist; it states only what has been
discovered.

## Work Packages

`Done` packages receive 100% credit, `Partial` packages receive their explicit
completion percentage, and `Planned` packages receive no credit.

| ID | Package | State | Complete | Estimate |
| --- | --- | --- | ---: | ---: |
| P00 | Initial desktop prototype and product baseline | Done | 100% | 130k |
| P01 | Selection stability, hints, arrows and full-text reading | Done | 100% | 28k |
| P02 | Keyboard editing flow and contextual creation | Done | 100% | 22k |
| P03 | Deletion, navigation, collapsible panels and minimap | Done | 100% | 45k |
| P04 | Hint and minimap stabilization | Done | 100% | 18k |
| P05 | Interaction, membership and visible layout transitions | Done | 100% | 38k |
| P06 | Keyboard help and shared hint controls | Done | 100% | 20k |
| P07 | Contextual minimap scale | Done | 100% | 12k |
| P08 | Transactional core, Undo/Redo and headless CLI | Done | 100% | 85k |
| P09 | General selection and structural context | Done | 100% | 38k |
| P10 | Composed canvas with explicit root and tree frames | Done | 100% | 42k |
| P11 | Keyboard frame reassignment | Done | 100% | 30k |
| P12 | Composed hierarchical layout | Done | 100% | 75k |
| P13 | Frame geometry and directional routing | Done | 100% | 35k |
| P14 | Multistart crossing optimization | Done | 100% | 42k |
| P15 | Complex Goal Tree reference fixture and evaluation | Done | 100% | 70k |
| P16 | Mental-map stability and layout acceptance margin | Done | 100% | 32k |
| P17 | Immediate deletion workflow | Done | 100% | 14k |
| P18 | Frame-unit layout and randomized visual baseline | Partial | 85% | 55k |
| P19 | Minimized frames as layout units | Done | 100% | 48k |
| P20 | Independent internal frame layout | Done | 100% | 30k |
| P21 | Keyboard frame minimize and expand | Done | 100% | 10k |
| P22 | Complete keyboard frame targets | Done | 100% | 16k |
| P23 | Strict layers and cycle handling | Done | 100% | 28k |
| P24 | Curved directional links | Done | 100% | 24k |
| P25 | Adaptive ports and layer spacing | Done | 100% | 28k |
| P26 | Cyclic entity type changes | Done | 100% | 18k |
| P27 | Legible repeated node insertion | Done | 100% | 14k |
| P28 | High-contrast element selection | Done | 100% | 14k |
| P29 | Persistent multi-selection highlight | Done | 100% | 10k |
| P30 | Autonomous keyboard audit and evidence | Done | 100% | 55k |
| P31 | Contextual hint priority | Done | 100% | 18k |
| P32 | Multi-diagram architecture assessment | Done | 100% | 28k |
| P33 | Executable semantic contract and oracles | Done | 100% | 80k |
| P34 | Semantic migration and Goal Tree activation | Done | 100% | 75k |
| P35 | Multi-project and multi-document foundation | Done | 100% | 35k |
| P36 | CRT vertical slice | Done | 100% | 95k |
| P37 | EC vertical slice | Done | 100% | 80k |
| P38 | Multipartite EC branches and semantic checks | Done | 100% | 90k |
| P39 | Assumption lifecycle | Done | 100% | 42k |
| P40 | Keyboard assumption context | Done | 100% | 35k |
| P41 | Global Assumption Workbench | Done | 100% | 45k |
| P42 | On-demand assumption indicators | Done | 100% | 12k |
| P43 | Boundary peer layout and collision-free hints | Done | 100% | 32k |
| P44 | Strict modular architecture, context and gate foundation | Done | 100% | 28k |
| P45 | Interaction and contract inventory | Done | 100% | 35k |
| P46 | Module charters and module acceptance suites | Done | 100% | 80k -> 250k |
| P47 | Plan normalization and CI architecture gates | Done | 100% | 25k -> 75k |
| P48 | Definition schema, canonical serialization and hash | Planned | 0% | 55k |
| P49 | Definition loader, security and rescue mode | Planned | 0% | 65k |
| P50 | Goal Tree, CRT and EC declarative packages | Planned | 0% | 70k |
| P51 | Definition CLI, migrations and package tooling | Planned | 0% | 55k |
| P52 | Copy and paste n-ary subgraphs | Planned | 0% | 32k |
| P53 | Rectangle selection | Planned | 0% | 18k |
| P54 | Editable keymap and collision detection | Planned | 0% | 32k |
| P55 | Full-screen frame focus | Planned | 0% | 55k |
| P56 | Portal grouping and inspection | Planned | 0% | 45k |
| P57 | External search, preview and connection while focused | Planned | 0% | 48k |
| P58 | Application facade and removal of direct renderer writes | Planned | 0% | 85k |
| P59 | Neutral LayoutGraph compiler | Planned | 0% | 75k |
| P60 | Routing, scoring and geometry modules | Planned | 0% | 50k |
| P61 | View Store and interaction controllers | Planned | 0% | 90k |
| P62 | Renderer and style component decomposition | Planned | 0% | 80k |
| P63 | Project-folder and multi-file workspace | Planned | 0% | 60k |
| P64 | Tabs and multi-document UI | Planned | 0% | 55k |
| P65 | Detached windows, synchronized views and restoration | Planned | 0% | 85k |
| P66 | Advanced optimization, performance and layout pins | Planned | 0% | 75k |
| P67 | Definition editor core | Planned | 0% | 100k |
| P68 | Preview, version, fork and package library | Planned | 0% | 90k |
| P69 | FRT official definition package | Planned | 0% | 65k |
| P70 | PrT official definition package | Planned | 0% | 55k |
| P71 | TrT official definition package | Planned | 0% | 60k |
| P72 | MCP and LLM adapter with permission scoping | Planned | 0% | 70k |
| P73 | AI-assisted creation, editing and review UX | Planned | 0% | 100k |
| P74 | LLM evaluations, audit and safety | Planned | 0% | 65k |
| P75 | Hardening, accessibility, performance and release | Planned | 0% | 100k |
| P76 | Weighted scope baseline and automated progress reporting | Done | 100% | 15k |
| P77 | Actual effort ledger and unknown traceability | Done | 100% | 25k |

## Operating Rule

At the end of every development step:

1. Update the affected package status or completion in
   `planning/work-packages.json`.
2. Add a package if newly accepted scope is not represented; never hide scope
   growth inside an existing estimate.
3. Run `npm run scope:status` and report the resulting weighted percentage.
4. Recalibrate the completed package estimate only when evidence shows a
   material difference; preserve the original and add an estimate revision.
5. Record runtime actuals, or explicitly record `unavailable`; register every
   discovered unknown before converting it into new scope.
