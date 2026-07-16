const DEFAULT_NODE_WIDTH = 210;
const DEFAULT_NODE_HEIGHT = 64;

const SCENARIOS = Object.freeze([
  Object.freeze({ id: "sparse", seed: 4101, childFrames: 1, nested: false, targetLinks: 20 }),
  Object.freeze({ id: "cross-frame", seed: 4102, childFrames: 2, nested: false, targetLinks: 25 }),
  Object.freeze({ id: "nested", seed: 4103, childFrames: 2, nested: true, targetLinks: 29 }),
  Object.freeze({ id: "fan-in", seed: 4104, childFrames: 2, nested: true, targetLinks: 34 })
]);

const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (values, random) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const frameFor = (canvas, frameId) => canvas.frames.find((frame) => frame.id === frameId);

const nodeBox = (tree, nodeId) => tree.layout.nodes[nodeId];

const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const straightRoute = (source, target) => {
  const sourceCenter = centerOf(source);
  const targetCenter = centerOf(target);
  const upward = targetCenter.y <= sourceCenter.y;
  return upward
    ? [
        { x: sourceCenter.x, y: source.y },
        { x: targetCenter.x, y: target.y + target.height }
      ]
    : [
        { x: sourceCenter.x, y: source.y + source.height },
        { x: targetCenter.x, y: target.y }
      ];
};

const placeGrid = (tree, nodeIds, bounds, columns, random) => {
  const horizontalGap = columns > 1 ? (bounds.width - DEFAULT_NODE_WIDTH) / (columns - 1) : 0;
  const rows = Math.ceil(nodeIds.length / columns);
  const verticalGap = rows > 1 ? (bounds.height - DEFAULT_NODE_HEIGHT) / (rows - 1) : 0;
  nodeIds.forEach((nodeId, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    tree.layout.nodes[nodeId] = {
      ...(tree.layout.nodes[nodeId] || {}),
      x: Math.round(bounds.x + column * horizontalGap + (random() - 0.5) * 12),
      y: Math.round(bounds.y + row * verticalGap + (random() - 0.5) * 10),
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
      pinned: false,
      layoutSource: "manual"
    };
  });
};

const createFrame = ({ id, canvas, tree, parentFrameId, name, semanticType = "visualGroup" }) => ({
  id,
  canvasId: canvas.id,
  treeId: tree.id,
  kind: "container",
  parentFrameId,
  name,
  semanticType,
  collapsed: false,
  childFrameIds: [],
  nodeIds: [],
  notes: "Deterministic randomized visual-layout fixture"
});

const createLink = (tree, sourceNode, targetNode, index) => {
  const id = `link-random-${index}-${sourceNode.id}-to-${targetNode.id}`;
  return {
    id,
    treeId: tree.id,
    sourceNodeId: sourceNode.id,
    targetNodeId: targetNode.id,
    type: "necessity",
    logic: "necessity",
    meaning: `${sourceNode.statement} is necessary for ${targetNode.statement}.`,
    verbalization: `In order to have ${targetNode.statement}, we must have ${sourceNode.statement}.`,
    assumptionIds: [],
    sourceIds: [],
    validation: {
      status: "draft",
      clarity: "unknown",
      logicCheck: "necessity-verbalized",
      missingAssumptions: true,
      notes: ""
    },
    visual: { route: [], routeSource: "manual", labelPosition: { x: 0, y: 0 } }
  };
};

const scenarioById = (scenarioId) => SCENARIOS.find((scenario) => scenario.id === scenarioId) || SCENARIOS[0];

const generateRandomLayoutFixture = (sourceWorkspace, options = {}) => {
  const scenario = scenarioById(options.scenarioId || options.id);
  const seed = Number.isFinite(options.seed) ? options.seed : scenario.seed;
  const random = seededRandom(seed);
  const workspace = structuredClone(sourceWorkspace);
  const tree = workspace.trees[0];
  const canvas = workspace.canvases.find((candidate) => candidate.id === tree.canvasId);
  const rootFrame = frameFor(canvas, canvas.rootFrameId);
  const hostFrame = frameFor(canvas, tree.hostFrameId);
  const goal = tree.nodes.find((node) => node.type === "goal");
  const csfs = tree.nodes.filter((node) => node.type === "criticalSuccessFactor");
  const necessaryConditions = shuffle(
    tree.nodes.filter((node) => node.type === "necessaryCondition"),
    random
  );

  workspace.fixtureType = "random-layout-visual-regression";
  workspace.randomLayoutFixture = { scenarioId: scenario.id, seed };
  workspace.workspace.name = `Random layout ${scenario.id} - seed ${seed}`;
  tree.name = `Random ${scenario.id} Goal Tree`;
  tree.layout.direction = "BT";
  tree.layout.optimization = {};
  tree.layout.quality = {};
  canvas.name = `Random ${scenario.id} canvas`;

  canvas.frames = [rootFrame, hostFrame];
  rootFrame.childFrameIds = [hostFrame.id];
  rootFrame.nodeIds = [];
  hostFrame.parentFrameId = rootFrame.id;
  hostFrame.childFrameIds = [];
  hostFrame.nodeIds = tree.nodes.map((node) => node.id);
  canvas.layout.frames = {
    [hostFrame.id]: { x: 36, y: 32, width: 1760, height: 1260, pinned: true, layoutSource: "manual" }
  };

  const childFrames = [];
  for (let index = 0; index < scenario.childFrames; index += 1) {
    const id = `frame-random-${scenario.id}-${index + 1}`;
    const child = createFrame({
      id,
      canvas,
      tree,
      parentFrameId: hostFrame.id,
      name: index === 0 ? "Operations cluster" : "Market cluster"
    });
    childFrames.push(child);
    canvas.frames.push(child);
    hostFrame.childFrameIds.push(id);
  }

  let nestedFrame = null;
  if (scenario.nested) {
    nestedFrame = createFrame({
      id: `frame-random-${scenario.id}-nested`,
      canvas,
      tree,
      parentFrameId: childFrames[0].id,
      name: "Nested capability"
    });
    canvas.frames.push(nestedFrame);
    childFrames[0].childFrameIds.push(nestedFrame.id);
  }

  const allocated = new Set();
  const takeNodes = (frame, count) => {
    frame.nodeIds = necessaryConditions
      .filter((node) => !allocated.has(node.id))
      .slice(0, count)
      .map((node) => {
        allocated.add(node.id);
        node.frameId = frame.id;
        return node.id;
      });
  };
  takeNodes(childFrames[0], nestedFrame ? 3 : 4);
  if (nestedFrame) takeNodes(nestedFrame, 4);
  if (childFrames[1]) takeNodes(childFrames[1], 4);
  hostFrame.nodeIds = tree.nodes.filter((node) => !allocated.has(node.id)).map((node) => node.id);
  for (const node of tree.nodes) {
    if (!allocated.has(node.id)) node.frameId = hostFrame.id;
  }

  canvas.layout.frames[childFrames[0].id] = {
    x: 72,
    y: 300,
    width: nestedFrame ? 780 : 520,
    height: nestedFrame ? 620 : 430,
    pinned: false,
    layoutSource: "manual"
  };
  if (childFrames[1]) {
    canvas.layout.frames[childFrames[1].id] = {
      x: 72,
      y: nestedFrame ? 930 : 770,
      width: 520,
      height: 330,
      pinned: false,
      layoutSource: "manual"
    };
  }
  if (nestedFrame) {
    canvas.layout.frames[nestedFrame.id] = {
      x: 330,
      y: 540,
      width: 500,
      height: 330,
      pinned: false,
      layoutSource: "manual"
    };
  }

  tree.layout.nodes = {};
  placeGrid(tree, [goal.id], { x: 1100, y: 65, width: 0, height: 0 }, 1, random);
  placeGrid(tree, csfs.map((node) => node.id), { x: 850, y: 230, width: 700, height: 0 }, 3, random);
  const hostNcIds = hostFrame.nodeIds.filter((nodeId) => nodeId !== goal.id && !csfs.some((node) => node.id === nodeId));
  placeGrid(tree, hostNcIds, { x: 920, y: 430, width: 780, height: 650 }, 3, random);
  placeGrid(
    tree,
    childFrames[0].nodeIds,
    nestedFrame
      ? { x: 105, y: 365, width: 0, height: 360 }
      : { x: 105, y: 365, width: 450, height: 150 },
    nestedFrame ? 1 : 2,
    random
  );
  if (nestedFrame) placeGrid(tree, nestedFrame.nodeIds, { x: 365, y: 605, width: 430, height: 140 }, 2, random);
  if (childFrames[1]) {
    const frameBox = canvas.layout.frames[childFrames[1].id];
    placeGrid(tree, childFrames[1].nodeIds, { x: frameBox.x + 35, y: frameBox.y + 75, width: 450, height: 140 }, 2, random);
  }

  const rankById = new Map([[goal.id, 0], ...csfs.map((node) => [node.id, 1])]);
  necessaryConditions.forEach((node, index) => rankById.set(node.id, 2 + Math.floor(index / 4)));
  const pairs = [];
  const pairKeys = new Set();
  const addPair = (source, target) => {
    const key = `${source.id}:${target.id}`;
    if (source.id === target.id || pairKeys.has(key)) return false;
    pairKeys.add(key);
    pairs.push([source, target]);
    return true;
  };
  csfs.forEach((csf) => addPair(csf, goal));
  necessaryConditions.forEach((source, index) => {
    const sourceRank = rankById.get(source.id);
    const candidates = tree.nodes.filter((target) => (rankById.get(target.id) ?? 0) < sourceRank);
    addPair(source, candidates[Math.floor(random() * candidates.length)]);
    if (index < 3) addPair(source, csfs[index]);
  });
  if (scenario.id === "fan-in") {
    const shared = necessaryConditions.at(-1);
    for (const target of [...csfs, ...necessaryConditions.slice(0, 3)]) {
      if ((rankById.get(target.id) ?? 0) < rankById.get(shared.id)) addPair(shared, target);
    }
  }
  let attempts = 0;
  while (pairs.length < scenario.targetLinks && attempts < 500) {
    attempts += 1;
    const source = necessaryConditions[Math.floor(random() * necessaryConditions.length)];
    const candidates = tree.nodes.filter(
      (target) => (rankById.get(target.id) ?? 0) < rankById.get(source.id)
    );
    addPair(source, candidates[Math.floor(random() * candidates.length)]);
  }

  tree.links = pairs.map(([source, target], index) => createLink(tree, source, target, index + 1));
  tree.layout.links = Object.fromEntries(
    tree.links.map((link) => {
      const route = straightRoute(nodeBox(tree, link.sourceNodeId), nodeBox(tree, link.targetNodeId));
      link.visual = { route, routeSource: "manual", labelPosition: route[0] };
      return [link.id, link.visual];
    })
  );

  canvas.viewState = {
    ...(canvas.viewState || {}),
    activeFrameId: hostFrame.id,
    selectedElementId: hostFrame.id,
    selectionRootIds: [hostFrame.id],
    mode: "navigation",
    zoom: 0.65,
    pan: { x: 0, y: 0 },
    panels: { leftOpen: false, rightOpen: false },
    breadcrumb: [tree.name, `Seed ${seed}`]
  };
  return workspace;
};

module.exports = { SCENARIOS, generateRandomLayoutFixture };
