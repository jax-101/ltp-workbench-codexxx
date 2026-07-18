# Definition Tooling and Migration Contract v1

Status: implemented in P51.

## Headless Commands

All commands are available through the same `ltp` executable and support
`--json` for agents and automation:

```bash
ltp definition inspect --package <directory> --json
ltp definition verify --package <directory> --json
ltp definition pin --package <directory> --json
ltp definition list --directory <library> --json
ltp definition compare --from-package <directory> --to-package <directory> --json
ltp definition migration preview --from-package <directory> --to-package <directory> --json
ltp definition migration apply --from-package <directory> --to-package <directory> --json
ltp definition migration rollback --receipt <receipt.json> --current-pin <pin.json> --json
```

Directory packages always pass through `loadDefinition`. Inspect, verify and pin
therefore inherit confinement, JSON/schema validation, resource budgets,
capability negotiation and exact content identity. Listing a library processes
child directories in stable lexical order and reports rejected packages without
hiding valid siblings.

## Migration Semantics

A migration is a pin transition, not executable transformation code. Preview
compares two securely loaded packages with the same definition ID and produces
a deterministic immutable plan.

Changes are classified as:

- `none`: source and target content identities are equal;
- `compatible`: additions or presentation/metadata changes preserve existing
  semantic vocabulary;
- `breaking`: semantic fields change, existing element or relation definitions
  change or disappear, or new kernel capabilities become mandatory.

Changed content requires a higher semantic version. Breaking changes require a
higher major version and `--allow-breaking` during apply. Apply verifies the
plan again against both exact packages and the current source pin, then returns
the target pin and deterministic receipt. Rollback accepts that receipt only
when the current pin still equals its target.

The CLI never writes a workspace, package, pin or receipt. JSON can be redirected
by an operator, while a future Workspace adapter must commit the returned pin
inside its own revision-aware transaction. This keeps Definition Runtime pure
and prevents tooling from bypassing Workspace ownership.

## Exit And Error Contract

- `0`: command completed and every requested package was accepted;
- `1`: invalid arguments, JSON, package, migration or unavailable library;
- `2`: a library list completed with one or more rejected child packages;
- `3`: reserved by the wider CLI for workspace revision conflicts.

Errors are serialized as `{ ok: false, error: { code, message, details } }`.
Automation branches on stable codes, never messages. Host paths and source
content are not included in Definition Runtime diagnostics.
