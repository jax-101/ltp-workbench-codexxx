const assert = require("node:assert/strict");
const {
  containsRectangle,
  normalizeRectangle,
  normalizeRoots,
  normalizeSelectionIds,
  selectContained
} = require("../src/renderer/rectangle-selection");

const rectangle = (left, top, right, bottom) => ({ left, top, right, bottom });

assert.deepEqual(
  normalizeRectangle({ x: 310, y: 260 }, { x: 40, y: 20 }),
  rectangle(40, 20, 310, 260),
  "drag direction must not change selection geometry"
);
assert(containsRectangle(rectangle(0, 0, 100, 100), rectangle(10, 10, 90, 90)));
assert.equal(
  containsRectangle(rectangle(0, 0, 100, 100), rectangle(90, 90, 110, 110)),
  false,
  "touching an entity is not enough; the whole box must be enclosed"
);

const candidates = [
  { id: "host", type: "frame", parentFrameId: null, rectangle: rectangle(0, 0, 500, 400) },
  { id: "team", type: "frame", parentFrameId: "host", rectangle: rectangle(40, 40, 260, 260) },
  { id: "nested", type: "frame", parentFrameId: "team", rectangle: rectangle(70, 80, 210, 210) },
  { id: "node-a", type: "node", frameId: "team", rectangle: rectangle(80, 90, 130, 130) },
  { id: "node-b", type: "node", frameId: "nested", rectangle: rectangle(145, 145, 195, 190) },
  { id: "node-c", type: "node", frameId: "host", rectangle: rectangle(330, 80, 390, 130) }
];

assert.deepEqual(
  selectContained(rectangle(60, 70, 220, 220), candidates).sort(),
  ["node-a", "nested"].sort(),
  "a fully enclosed nested frame replaces its own descendant node as a root"
);
assert.deepEqual(
  selectContained(rectangle(75, 85, 200, 195), candidates).sort(),
  ["node-a", "node-b"],
  "entities can be selected without enclosing their frame"
);
assert.deepEqual(
  selectContained(rectangle(-10, -10, 510, 410), candidates),
  ["host"],
  "the outermost enclosed frame is the only explicit selection root"
);
assert.deepEqual(
  normalizeRoots([
    candidates[1],
    candidates[2],
    candidates[3],
    candidates[4]
  ]),
  ["team"],
  "hierarchical candidates normalize deterministically"
);
assert.deepEqual(
  normalizeSelectionIds(["node-b", "team"], candidates),
  ["team"],
  "adding an ancestor frame replaces a previously selected descendant root"
);

console.log("Rectangle selection passed: direction independence, full containment, additive selection and hierarchical root normalization.");
