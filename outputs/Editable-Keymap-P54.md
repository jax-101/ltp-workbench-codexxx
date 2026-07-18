# P54 - Editable Scoped Keymap

Build: `3C.16c`  
Package: `P54` - Editable keymap and collision detection  
Status: complete

## Delivered

- `Cmd+,`, the command palette and the left panel open one keyboard-first editor.
- Every command supports zero or more captured bindings and an explicit global, workspace, canvas or assumptions scope.
- The editor searches commands, adds, replaces and removes bindings, restores defaults and reveals the JSON file.
- Validation expands bindings to physical macOS and Windows/Linux signatures before detecting collisions.
- Invalid edits remain visible but cannot replace the active keymap.
- `keymap.v1.json` is written atomically outside project workspaces, with a last-known-good artifact and embedded fallback.
- Saved changes apply immediately; text fields retain native editing shortcuts.

## Architecture

View owns the pure keymap contract, default command catalog, event resolution
and editor. The Electron adapter owns only atomic persistence and file reveal.
The existing command configuration became a small compatibility facade over the
versioned contract. IPC, browser scripts and source ownership are declared as
the explicit `C015` interaction.

No legacy budget grew: `app.js` remains at 6,494 lines and `main.js` at 585.

## Verification

- Unit tests cover schema errors, unknown commands, exclusive scopes and cross-platform collisions.
- Persistence tests cover atomic save, resource limits, broken JSON, last-known-good recovery and default reset.
- View and Adapters black-box module suites exercise the contract independently.
- Visual UAT captures a real key, applies it, resolves it, restores defaults and exposes one non-saveable collision.
- Full headless regression and Electron smoke passed.
- Visual UAT passed `41/41`; shortcut audit passed `47/47` across 38 commands.
- The macOS arm64 application was packaged with build identity `3C.16c`.

## Effort and scope

Runtime-measured effort: `506,237` tokens over 1,181 incremental seconds, only
`1.2%` above the revised `500k` forecast. P55 is locally recalibrated from `55k`
to `600k`. Weighted known-scope progress is `65.5%` after that correction.

Next: `P55`, full-screen frame focus.
