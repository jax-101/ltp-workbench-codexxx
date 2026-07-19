const assert = require("node:assert/strict");
const focus = require("../src/core/frame-focus");
const focusView = require("../src/renderer/frame-focus-view");
const breadcrumbs = require("../src/renderer/frame-focus-breadcrumbs");
const minimap = require("../src/renderer/minimap");

const frames = [
  { id: "root", parentFrameId: null },
  { id: "tree", parentFrameId: "root" },
  { id: "team", parentFrameId: "tree" },
  { id: "nested", parentFrameId: "team" },
  { id: "other", parentFrameId: "tree" }
];
const nodes = [
  { id: "a", frameId: "team" },
  { id: "b", frameId: "nested" },
  { id: "c", frameId: "other" }
];
const general = { zoom: 0.8, pan: { x: 140, y: 90 }, activeFrameId: "tree", selectionRootIds: ["team"] };

let session = focus.emptySession();
const first = focus.enter(session, "team", general, frames, { rootFrameId: "root" });
assert.equal(first.ok, true);
session = first.session;
assert.equal(focus.currentFrameId(session), "team");
assert.deepEqual([...focus.visibleFrameIds(frames, "team")], ["team", "nested"]);
assert.deepEqual([...focus.visibleNodeIds(nodes, focus.visibleFrameIds(frames, "team"))], ["a", "b"]);

const focused = { zoom: 1.4, pan: { x: 300, y: 180 }, activeFrameId: "team", selectionRootIds: ["nested"] };
const second = focus.enter(session, "nested", focused, frames, { rootFrameId: "root" });
assert.equal(second.ok, true);
session = second.session;
assert.deepEqual(focus.focusPath(session), ["team", "nested"]);
assert.equal(focus.enter(session, "other", focused, frames).error.code, "VIEW_FOCUS_OUTSIDE");
assert.equal(focus.enter(session, "root", focused, frames, { rootFrameId: "root" }).error.code, "VIEW_FOCUS_INVALID");

const nestedExit = focus.exit(session);
assert.deepEqual(nestedExit.restoreView, focused);
assert.equal(nestedExit.frameId, "team");
const generalExit = focus.exit(nestedExit.session);
assert.deepEqual(generalExit.restoreView, general);
assert.equal(generalExit.frameId, null);
assert.equal(focus.exit(generalExit.session).error.code, "VIEW_FOCUS_INACTIVE");

let activeView = structuredClone(general);
const changes = [];
const controller = focusView.create({
  getFrames: () => frames,
  getRootFrameId: () => "root",
  captureView: () => structuredClone(activeView),
  activateView: (frameId) => { activeView = { zoom: 1, pan: { x: 0, y: 0 }, activeFrameId: frameId }; },
  restoreView: (view) => { activeView = structuredClone(view); },
  onChanged: (change) => changes.push(change)
});

assert.equal(controller.enter("team").ok, true);
assert.equal(controller.currentFrameId(), "team");
assert.equal(controller.containsNode(nodes[0]), true);
assert.equal(controller.containsNode(nodes[2]), false);
activeView = structuredClone(focused);
assert.equal(controller.enter("nested").ok, true);
assert.deepEqual(controller.path(), ["team", "nested"]);
assert.equal(controller.exitTo("other").error.code, "VIEW_FOCUS_PATH_INVALID");
assert.equal(controller.exitTo("team").ok, true);
assert.deepEqual(activeView, focused);
assert.equal(controller.exitTo(null).ok, true);
assert.deepEqual(activeView, general);
assert.equal(changes.at(-1).frameId, null);

const focusedTrail = breadcrumbs.trail({
  frames,
  focusPath: ["team", "nested"],
  activeFrameId: "nested",
  systemName: "System <A>",
  documentName: "Goal Tree"
});
assert.deepEqual(focusedTrail.map((item) => item.label), ["System <A>", "Goal Tree", "team", "nested"]);
assert.deepEqual(focusedTrail.filter((item) => item.interactive).map((item) => item.id), ["", "team"]);
const breadcrumbMarkup = breadcrumbs.render({ frames, focusPath: ["team", "nested"], systemName: "System <A>", documentName: "Goal Tree" });
assert.match(breadcrumbMarkup, /data-frame-focus-target="team"/);
assert.match(breadcrumbMarkup, /System &lt;A&gt;/);
assert.match(breadcrumbMarkup, /aria-current="page">nested/);

const focusDomain = { x: 100, y: 80, width: 400, height: 300 };
const projection = minimap.project({
  size: { width: 1600, height: 900 },
  clientWidth: 240,
  clientHeight: 160,
  zoom: 1,
  viewport: { left: 120, top: 100 },
  domain: focusDomain,
  frames: [{ box: { x: 100, y: 80, width: 400, height: 300 } }],
  nodes: [{ box: { x: 150, y: 130, width: 120, height: 80 }, type: "condition" }]
});
assert.deepEqual(focusDomain, { x: 100, y: 80, width: 400, height: 300 }, "projection must not mutate its domain");
assert.deepEqual(projection.metrics.domain, focusDomain);
assert.match(projection.html, /minimap-node-condition/);
assert.deepEqual(
  minimap.logicalPoint({ x: 25, y: 30 }, { left: 5, top: 10 }, projection.metrics),
  { x: 100 + 20 / projection.metrics.scale, y: 80 + 20 / projection.metrics.scale }
);

console.log("Frame focus passed: nested closure, guarded breadcrumbs, scoped minimap and exact LIFO view restoration.");
