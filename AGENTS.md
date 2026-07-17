# Agent Instructions

Before changing this repository:

1. Read `CONTEXT.md` for current architecture, technology, status and commands.
2. Read `ARCHITECTURE.md` for mandatory module boundaries and test policy.
3. Check `outputs/Interface-Improvement-Plan.md` for the active increment.
4. Check `planning/work-packages.json` for its scope ID, estimate and status.
5. Check `planning/unknowns.json` and `planning/effort-log.json` for discoveries,
   actual usage and prior estimate revisions.

Work in one small, reversible capability at a time. Add unit, contract or
module acceptance evidence at the boundary being changed. Run
`npm run test:architecture` before broader suites.

Do not add behavior directly to a legacy oversized file without first checking
whether the touched responsibility can be extracted safely. Existing no-growth
budgets are enforced by `scripts/test-architecture.js`.

Update `CONTEXT.md` whenever build identity, dependencies, architecture, status
or verification commands change. Record durable decisions and reusable lessons
in their logs.

At the end of every development step, update the affected work package, run
`npm run scope:status`, synchronize the percentage in `CONTEXT.md` and
`outputs/Scope-Effort-Baseline.md`, and report that percentage to the user.
Every stopping update must also name the current build, the completed or active
work package, its state, and the next package in the general roadmap.
Represent newly accepted scope as a new package instead of silently expanding
an existing package.

Start actual-effort tracking when a package starts and append the final
runtime-reported token total when it closes. If the runtime exposes no usage,
record `unavailable`; never call an estimate an actual. Preserve every estimate
change in `planning/effort-log.json`. Register each newly discovered unknown
before resolving it or converting it into packages, and report open unknowns.
When supported, associate one runtime goal with the active package and use its
reported final usage; do not invent a token budget unless the user sets one.
