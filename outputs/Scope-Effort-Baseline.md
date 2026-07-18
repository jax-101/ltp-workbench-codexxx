# Scope and Effort Baseline

Updated: 2026-07-18  
Baseline build: `3C.16c`
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
| Completed packages | 56 |
| Partially completed packages | 1 |
| Planned packages | 21 |
| Total estimated scope | 5,981,000 tokens |
| Earned effort | 3,919,750 tokens |
| Remaining effort | 2,061,250 tokens |
| **Weighted scope complete** | **65.5%** |

`P18` is credited at 85%; its remaining nested-frame optimization is represented
again only where it becomes distinct advanced layout work, avoiding double
counting. The next active package is `P55`, full-screen frame focus.

## Portfolio View

| Portfolio | Packages | Estimate | Earned |
| --- | --- | ---: | ---: |
| Initial foundation | P00 | 130k | 130k |
| Iterations 1 through 3A | P01-P11 | 378k | 378k |
| Layout builds 3B | P12-P18 | 323k | 314.75k |
| Builds 3C through modular foundation | P19-P44 | 990k | 990k |
| Modular due diligence | P45-P47 | 360k | 360k |
| Definition Runtime | P48-P51 | 975k | 975k |
| Interaction backlog | P52-P54 | 732k | 732k |
| Frame focus | P55-P57 | 693k | 0 |
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

P48 closed at `410,421` tokens and 805 seconds against a `55k` baseline:
`+355,421`, or `+646.2%` (`7.46x`). Measurement coverage is now `4/51`
started packages, with `1,089,591` actual tokens recorded. P49 is the nearest
Definition Runtime package and carries greater security risk, so its forecast
is revised from `65k` to `450k`. This adds `385k` to known scope and moves the
weighted percentage from `55.9%` to `51.1%`; unrelated package classes remain
unchanged.

P49 completed with its `450k` revised estimate fully earned, moving weighted
scope to `61.2%`. This task did not expose package-scoped token telemetry after
the preceding goal closed, so event `E0011` records the actual as unavailable
rather than manufacturing a measurement. Actual coverage is therefore `4/52`
started packages (`7.7%`) and the measured total remains `1,089,591` tokens.

P50 closed at `394,280` actual tokens and 1,023 seconds against its `70k`
baseline: `+324,280`, or `+463.3%` (`5.63x`). Its black-box parity work resolved
U013. P51 is the nearest remaining Definition Runtime package, so its forecast
is revised from `55k` to `400k`; the original remains visible. This adds `345k`
to known scope and, despite earning all `70k` of P50, moves weighted progress to
`58.2%`. Actual coverage is `5/53` started packages (`9.4%`), with `1,483,871`
runtime-reported tokens recorded.

P51 closed at `334,018` incremental actual tokens and 888 incremental seconds.
That is `+279,018` or `+507.3%` (`6.07x`) against its original `55k` baseline,
but `-65,982` or `-16.5%` against the revised `400k` forecast. The local
Definition Runtime recalibration was therefore directionally useful. Completing
P51 raises weighted progress to `66.6%`; actual coverage is `6/54` started
packages (`11.1%`) with `1,817,889` tokens recorded. Interaction package P52 is
not revised from this different implementation class.

P52 closed at `453,031` incremental actual tokens and 983 incremental seconds.
That is `+421,031` or `+1,315.7%` (`14.16x`) against its original `32k`
baseline. The work included a closed-subgraph contract, native and legacy
atomic mutation, keyboard integration, architectural extraction and complete
visual shortcut evidence. P53 is the nearest interaction package but has a
narrower semantic surface, so its forecast is revised from `18k` to `200k`.
This transparent recalibration raises known scope by `182k`; despite completing
P52, weighted progress becomes `64.8%`. Actual coverage is `7/55` started
packages (`12.7%`) with `2,270,920` runtime-reported tokens recorded.

P53 closed at `513,490` incremental actual tokens and 1,273 incremental seconds.
That is `+495,490`, or `+2,752.7%` (`28.53x`), against its original `18k`
baseline and `+313,490`, or `+156.7%`, against its revised `200k` forecast.
Together, adjacent P52 and P53 show that interaction work crossing View,
application semantics and visual UAT is consistently underweighted. P54 spans
configuration, keyboard scopes, validation, UI and persistence, so its forecast
is revised locally from `32k` to `500k`. Known scope rises by `468k`; after P53
completion, weighted progress is `62.9%`. Actual coverage is `8/56` started
packages (`14.3%`) with `2,784,410` runtime-reported tokens recorded.

P54 closed at `506,237` incremental actual tokens and 1,181 incremental seconds.
That is `+474,237`, or `+1,482.0%` (`15.82x`), against its original `32k`
baseline, but only `+6,237`, or `+1.2%`, against its revised `500k` forecast.
The local interaction calibration is therefore strongly supported. P55 adds
focused projection, independent view restoration and frame hierarchy risk, so
its forecast is revised from `55k` to `600k` without changing P56 or P57 yet.
Known scope rises by `545k`; after completing P54, weighted progress is `65.5%`.
Actual coverage is `9/57` started packages (`15.8%`) with `3,290,647`
runtime-reported tokens recorded.

For every subsequent package, cumulative runtime usage is recorded as an
append-only snapshot:

```bash
npm run scope:record-effort -- \
  --package P45 --status measured --tokens 42000 \
  --source codex-goal --note "Final runtime usage"
```

Allowed states are `tracking`, `partial`, `measured` and `unavailable`. A new
package cannot become partial or done without a measured, partial or explicitly
unavailable effort event; a measured event may be its first snapshot.
`npm run scope:status -- --json` exposes the baseline,
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
| U010 | Long-thread context overhead | Mitigated | P46 revised to 250k, P47 to 75k and comparable P49 to 450k |
| U011 | Layout output depended on implicit wall clock | Resolved | Layout requests accept an explicit timestamp for deterministic acceptance |
| U012 | First hosted CI execution | Resolved | Two hosted Quality Gate runs passed with functional regression gated by architecture |
| U013 | Definition v1 official-package expressiveness | Resolved | P50 proves exact semantic, compatibility and fixture parity without privileged paths |
| U014 | GitHub Actions v4 Node 20 runtime deprecation | Assessed | Upgrade actions and reverify within existing P75 hardening scope |

Current register: 14 unknowns; five converted, three assessed, two mitigated and
four resolved. There are no untriaged open unknowns today. This does not
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
| P48 | Definition schema, canonical serialization and hash | Done | 100% | 55k |
| P49 | Definition loader, security and rescue mode | Done | 100% | 65k -> 450k |
| P50 | Goal Tree, CRT and EC declarative packages | Done | 100% | 70k |
| P51 | Definition CLI, migrations and package tooling | Done | 100% | 55k -> 400k |
| P52 | Copy and paste n-ary subgraphs | Done | 100% | 32k |
| P53 | Rectangle selection | Done | 100% | 18k -> 200k |
| P54 | Editable keymap and collision detection | Done | 100% | 32k -> 500k |
| P55 | Full-screen frame focus | Planned | 0% | 55k -> 600k |
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
