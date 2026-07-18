# P53 - Deterministic Rectangle Selection

Build: `3C.16b`  
Package: `P53` - Rectangle selection  
Status: complete

## Delivered

- Left-button drag on canvas or frame background draws a stable selection rectangle.
- Only fully enclosed visible entities enter the selection; drag direction does not matter.
- An enclosed frame replaces its descendants as the explicit semantic root.
- Command, Control or Shift adds to the existing selection and normalizes the combined hierarchy.
- Node, link, hint and form controls keep their own pointer behavior.
- The existing prominent multi-selection style, inspector and collective commands remain available.

## Architecture

`rectangle-selection.js` is a View-owned controller. Its pure geometry and
hierarchy functions are independent from the DOM; the binding layer only
collects visible boxes, renders the transient overlay and emits one selection
event. The legacy renderer applies that intent without growing its no-growth
budget because contextual command labels were extracted to `command-config.js`.

## Verification

- Unit tests cover reverse drags, full containment, nested frames and additive normalization.
- Independent View acceptance exercises the public selection behavior.
- Electron visual acceptance starts the gesture on a frame and verifies all expected roots.
- The complete prototype regression passed, including collective movement, connection, clipboard and Undo/Redo.
- Visual UAT passed `40/40`; shortcut audit passed `46/46`.
- The macOS arm64 application was packaged with build identity `3C.16b`.

## Effort and scope

Runtime-measured effort: `513,490` tokens over 1,273 incremental seconds.
P54 was recalibrated from `32k` to `500k` using P52 and P53 as the two nearest
interaction anchors. Weighted known-scope progress is `62.9%` after the
transparent forecast correction.

Next: `P54`, editable keymap and deterministic collision detection.
