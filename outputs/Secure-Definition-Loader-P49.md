# Secure Definition Loader - P49

Build: `3C.15b`  
Package: `P49`  
Status: PASS

## Delivered Contract

Definition Runtime now exposes one public loading path for directory and
workspace-embedded packages. Both sources produce the same immutable artifact,
fixture map and canonical identity; official versus personal provenance grants
no additional behavior.

The implemented `definition.loading.v1` contract provides:

- `loadDefinition` with explicit supported kernel capabilities;
- `createDefinitionPin` and strict `validatePin`;
- `resolvePinnedDefinition` with deterministic snapshot-first resolution;
- typed `ready/read-write` and `rescue/read-only` outcomes;
- safe stable diagnostics without absolute host paths or source excerpts.

## Security Boundary

The loader fixes the entry point to `diagram-definition.json`, resolves the
package root, rejects symlinks in every resource segment and verifies the
opened file remains the confined inode. Reads are bounded through the file
handle. Strict UTF-8, JSON, schema and invariant checks run before use.

Default ceilings are 512 KiB per definition, 2 MiB per fixture, 8 MiB total,
64 JSON levels, 100,000 JSON nodes and 64 resolution candidates. Callers can
tighten but cannot raise these values. Embedded accessors and other non-JSON
properties are rejected without invoking them.

The complete threat model and package format are documented in
`definition-contract/v1/PACKAGE.md`.

## Reproducibility And Rescue

A pin is the exact tuple `formatVersion + id + semantic version + canonical
SHA-256`. Changed content under a published version cannot become editable.
Missing content and malformed packages yield a null-package rescue; an exact
valid artifact requiring unsupported capabilities remains inspectable but
read-only. The Definition Runtime does not own workspace files, so later
workspace adapters consume this result rather than duplicating its policy.

## Evidence

- Definition artifact and hostile-value tests: PASS.
- Loader security, source parity, pin and rescue tests: PASS.
- Seven implemented-module black-box UAT suites: PASS.
- Full headless prototype regression including semantic, CRT, EC and layout: PASS.
- Standalone macOS package: PASS in isolated output; all runtime, schema and AJV paths present.
- Production dependency audit: zero reported vulnerabilities.
- Hosted [Quality Gate run 29623088953](https://github.com/jax-101/ltp-workbench/actions/runs/29623088953): PASS.

The default `outputs/dist` package target was occupied by an existing macOS
application and could not be replaced. Verification used an isolated output
directory and removed it after inspecting `app.asar`. Code signing remains
skipped because no Developer ID Application certificate is configured.

## Traceability

`U013` remains assessed for P50, where
Goal Tree, CRT and multipartite EC must prove the v1 schema and loader without
privileged code paths. Runtime token telemetry was unavailable for this task;
event `E0011` records that fact and does not substitute the 450k forecast as an
actual. Hosted CI exposed low-impact `U014`, assigned to existing P75 hardening
scope without changing the denominator. Weighted known-scope progress is
`61.2%`.
