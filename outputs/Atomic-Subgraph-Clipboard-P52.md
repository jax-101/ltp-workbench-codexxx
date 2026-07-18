# P52 - Atomic Subgraph Clipboard

Build: `3C.16a`  
Package: `P52` - Copy and paste n-ary subgraphs  
Status: complete

## Delivered

- `Cmd/Ctrl+C` captures an immutable `subgraph.clipboard.v1` snapshot.
- A relation is included only when every input and output element is selected.
- Assumptions and closed derivations follow their copied relations.
- `Cmd/Ctrl+V` remaps every semantic ID, preserves relative geometry and targets the active tree frame.
- Native CRT/EC-shaped graphs and the legacy Goal Tree projection share one atomic command.
- One paste creates one history entry, so Undo and Redo remove or restore the complete subgraph.
- Text fields retain native copy and paste behavior.

## Architecture

The View-owned clipboard module captures selection and emits one intent. The
Application-owned transfer module validates contract version, diagram
compatibility, closure, target frame, origin and the complete ID map before
mutating a draft. The transaction engine performs the semantic projection and
workspace validation after the command.

No legacy no-growth budget increased: `app.js` shrank to 6,486 lines and
`command-registry.js` remains at 677 lines.

## Verification

- Native CRT n-ary copy with relation assumptions.
- Partial n-ary selection excludes the open relation.
- Legacy Goal Tree parity.
- Invalid open references roll back without changing revision or content.
- Atomic Undo/Redo.
- Electron smoke suite passed.
- Shortcut audit passed `46/46`, with screenshots for copy and paste.
- Full architecture and independent module acceptance gates passed.

## Effort and scope

Runtime-measured effort: `453,031` tokens over 983 incremental seconds.
P53 was recalibrated from `18k` to `200k` using this nearest interaction
evidence, while unrelated packages remain unchanged. Weighted known-scope
progress is `64.8%` after the forecast correction.

Next: `P53`, deterministic rectangle selection.
