# P48 - Definition Artifact Contract

Status: PASS
Date: 2026-07-18
Build: `3C.15a`

## Result

P48 implements the first production surface of Definition Runtime without
loading files or compiling diagram behavior. `definition.artifact.v1` accepts a
declarative definition, validates its Draft 2020-12 schema and cross-field
invariants, serializes it with [RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785),
and returns an immutable artifact identified by SHA-256.

The schema is split by responsibility into common JSON values, semantic types,
layout/presentation and the root definition. It covers element and relation
types, attributes, cardinality, assumptions, topology, declarative rules and
recipes, layout preferences, styles and fixture references. Unknown properties
and executable or non-JSON values are rejected.

## Identity Contract

```text
definition id + semantic version + sha256(RFC8785(definition UTF-8 bytes))
```

Object key order never changes identity; array order remains meaningful. The
runtime rejects cycles, sparse arrays, custom prototypes, symbols, functions,
non-finite numbers and invalid Unicode. The golden minimal fixture hashes to:

```text
sha256:006e276bbf357a44f9ff25adf65a8df2a83653c0cb564da229740ac15666d3c1
```

## Evidence

```bash
npm run test:definition
npm run test:modules
npm run test:architecture
npm audit --omit=dev
```

The tests cover schema success/failure, invariant diagnostics, key reordering,
golden hashing, exact round trips, deep immutability, tamper detection and
hostile JavaScript values. The production dependency audit reports zero known
vulnerabilities.

Hosted [Quality Gate run 29622217532](https://github.com/jax-101/ltp-workbench/actions/runs/29622217532)
passed on Node 22: architecture and module contracts completed before the
dependent headless functional regression.

`U013` remains assessed until P50 proves that Goal Tree, CRT and multipartite EC
can use this exact format without hardcoded exceptions. P49 is next and owns
file loading, resource limits, path confinement, version pins and rescue mode.

## Delivery Metrics

Final runtime effort was `410,421` tokens over 805 seconds, `7.46x` the original
`55k` baseline. P49 is the nearest comparable Definition Runtime package and is
revised from `65k` to `450k`; the larger known denominator places weighted
project progress at `51.1%`.
