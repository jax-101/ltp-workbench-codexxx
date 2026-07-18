# Diagram Definition Contract v1

Status: implemented artifact contract; official-package parity remains tracked by `U013` until P50.

## Boundary

This contract defines the data shape and content identity of a diagram
definition. It does not locate files, enforce package path security, resolve a
version pin or compile runtime capabilities. Those responsibilities belong to
P49 and P50.

The root schema is `diagram-definition.schema.json`. Supporting schemas divide
common JSON values, semantic vocabulary and layout/presentation data. AJV
8.20.0 validates Draft 2020-12 without fetching remote resources.

## Identity

Definition identity is the tuple:

```text
definition id + semantic version + sha256(RFC8785(definition))
```

Canonicalization follows [RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785):
object properties are sorted recursively by UTF-16 code units, array order is
preserved, JSON primitives use ECMAScript serialization, invalid Unicode and
non-finite numbers are rejected, and SHA-256 consumes the UTF-8 bytes. Hashes
use the textual form `sha256:<64 lowercase hex characters>`.

`formatVersion: "1"` and the v1 schemas are immutable once consumed. An
incompatible data-shape change creates a new format version. Extensible rule,
recipe and presentation behavior is expressed through named capabilities and
JSON parameters, never executable code.

## Verification

`fixtures/minimal-valid.json` and `fixtures/expected-hashes.json` form the
golden compatibility pair. Run:

```bash
npm run test:definition
npm run test:modules
```
