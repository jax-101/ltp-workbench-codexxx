# Agent Instructions

Before changing this repository:

1. Read `CONTEXT.md` for current architecture, technology, status and commands.
2. Read `ARCHITECTURE.md` for mandatory module boundaries and test policy.
3. Check `outputs/Interface-Improvement-Plan.md` for the active increment.

Work in one small, reversible capability at a time. Add unit, contract or
module acceptance evidence at the boundary being changed. Run
`npm run test:architecture` before broader suites.

Do not add behavior directly to a legacy oversized file without first checking
whether the touched responsibility can be extracted safely. Existing no-growth
budgets are enforced by `scripts/test-architecture.js`.

Update `CONTEXT.md` whenever build identity, dependencies, architecture, status
or verification commands change. Record durable decisions and reusable lessons
in their logs.
