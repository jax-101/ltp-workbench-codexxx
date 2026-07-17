# P47 - Plan Normalization and CI Gates

Status: PASS
Date: 2026-07-18
Build: `3C.14d.3`

## Result

P47 closes the strict-modular due-diligence phase. The general roadmap now has
one operational model: `work-packages.json` owns package state and effort,
`roadmap.json` owns the 16-stage sequence and active package, and
`Plan-Status.md` is an exact generated Markdown projection.

The plan gate proves that all 78 packages occur exactly once, IDs are contiguous,
the active package exists and is unfinished, the generated projection is fresh,
estimate revisions cite real effort events, actual snapshots never decrease and
unknown-to-package traceability is bidirectional.

## CI Boundary

`.github/workflows/quality.yml` runs for pushes and pull requests with read-only
repository permissions. Its jobs are deliberately separated:

1. `architecture` installs from the lockfile, runs the full architecture gate
   and executes all implemented module UATs.
2. `functional` declares `needs: architecture` and runs the headless prototype
   regression only after the first job passes.

The workflow contract is itself executable. It rejects missing triggers,
permission drift, missing commands or a functional job that no longer depends
on architecture.

## Evidence

```bash
npm run plan:write
npm run test:plan
npm run test:ci
npm run test:architecture
npm run test:modules
npm run test:prototype -- --no-smoke
```

The active roadmap package after P47 is P48: Definition schema, canonical
serialization and hash. `U012` tracks observation of the first hosted GitHub
run separately from the locally verified workflow contract.
