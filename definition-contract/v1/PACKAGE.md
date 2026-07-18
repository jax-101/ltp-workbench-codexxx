# Definition Package Contract v1

Status: implemented secure loader contract.

## Package Shape

A directory package has one fixed entry point and only declarative JSON:

```text
diagram-definition.json
fixtures/<portable-relative-path>.json
```

The definition declares every fixture path. Directory, official, personal and
workspace-embedded definitions all enter the same `loadDefinition` pipeline.
An embedded source supplies the definition object and a fixture map; it does
not gain extra capabilities or bypass validation.

## Trust Boundary

Package content, names, paths and sizes are untrusted. The caller supplies the
kernel capability IDs it supports. The runtime never evaluates source text,
loads JavaScript, fetches schemas or follows package symlinks.

The loader protects these assets:

- process availability and bounded memory use;
- files outside the selected package root;
- reproducible meaning of an opened diagram;
- host path and source-content privacy in public diagnostics.

Controls are applied before a package becomes usable:

- fixed entry point and portable relative fixture paths;
- real package root plus rejection of symlinks in package resources;
- strict UTF-8 JSON, Definition v1 schema and cross-field invariants;
- caller-tightenable byte, depth, node and source-count ceilings;
- explicit supported-capability comparison;
- immutable normalized output and exact content pinning.

This is not a sandbox for executable plugins. Future trusted plugins require a
separate capability and process-isolation design.

## Default Budgets

| Resource | Ceiling |
| --- | ---: |
| Definition JSON | 512 KiB |
| One fixture | 2 MiB |
| Total loaded bytes | 8 MiB |
| JSON depth | 64 |
| JSON nodes | 100,000 |
| Candidate sources per resolution | 64 |

Callers may tighten but cannot raise these ceilings through loader options.

## Reproducible Resolution

`createDefinitionPin` records `formatVersion`, definition `id`, semantic
`version` and canonical SHA-256. `resolvePinnedDefinition` checks an optional
embedded snapshot first and then candidate package sources in stable order.
Only an exact tuple may produce a `ready` / `read-write` outcome.

Missing versions, changed content, malformed packages, exhausted budgets or
unsupported capabilities produce a deterministic `rescue` / `read-only`
outcome. A valid exact artifact with unsupported capabilities remains
inspectable, but cannot be edited. Invalid or unavailable content is represented
by a null package plus safe diagnostics, allowing the workspace adapter to open
the rest of a project without treating suspect content as executable behavior.

## Verification

`npm run test:definition-loader` covers source parity, immutable output, exact
pins, snapshots, missing and changed versions, unsupported capabilities,
malformed JSON and UTF-8, byte/depth/source budgets, missing files and symlink
escape attempts. The Definition Runtime black-box UAT covers both `ready` and
`rescue` outcomes through the public API.
