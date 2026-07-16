const ELK = require("elkjs/lib/elk.bundled.js");
const { getDiagramDefinition } = require("./diagram-registry");

const FRAME_SIDE_PADDING = 28;
const FRAME_TOP_PADDING = 58;
const FRAME_BOTTOM_PADDING = 28;
const ROOT_MARGIN = 72;
const ITEM_SPACING = 48;
const LAYER_SPACING = 96;
const MIN_FRAME_WIDTH = 300;
const MIN_FRAME_HEIGHT = 180;
const ROUTE_CLEARANCE = 14;

const elkDirection = (direction) =>
  ({
    TB: "DOWN",
    BT: "UP",
    LR: "RIGHT",
    RL: "LEFT"
  })[direction] || "DOWN";

const boxesOverlap = (left, right, gap = 0) =>
  left.x < right.x + right.width + gap &&
  left.x + left.width + gap > right.x &&
  left.y < right.y + right.height + gap &&
  left.y + left.height + gap > right.y;

const boxContains = (outer, inner, tolerance = 0.5) =>
  inner.x >= outer.x - tolerance &&
  inner.y >= outer.y - tolerance &&
  inner.x + inner.width <= outer.x + outer.width + tolerance &&
  inner.y + inner.height <= outer.y + outer.height + tolerance;

const translateBoxMap = (boxes, offsetX, offsetY) =>
  Object.fromEntries(
    Object.entries(boxes).map(([id, box]) => [id, { ...box, x: box.x + offsetX, y: box.y + offsetY }])
  );

const previousNodeBox = (nodeOwners, nodeId) => {
  const owner = nodeOwners.get(nodeId);
  return owner?.tree.layout?.nodes?.[nodeId] || null;
};

const nodeSize = (nodeOwners, nodeId) => {
  const previous = previousNodeBox(nodeOwners, nodeId);
  return {
    width: previous?.width || 250,
    height: previous?.height || 72
  };
};

const directItemForNode = (containerFrameId, nodeId, nodeOwners, frameById) => {
  const owner = nodeOwners.get(nodeId);
  if (!owner) return null;
  if (owner.node.frameId === containerFrameId) return nodeId;

  let frame = frameById.get(owner.node.frameId);
  while (frame?.parentFrameId) {
    if (frame.parentFrameId === containerFrameId) return frame.id;
    frame = frameById.get(frame.parentFrameId);
  }
  return null;
};

const collapsedEdges = (containerFrameId, links, nodeOwners, frameById) => {
  const pairs = new Set();
  const edges = [];
  for (const link of links) {
    const source = directItemForNode(containerFrameId, link.sourceNodeId, nodeOwners, frameById);
    const target = directItemForNode(containerFrameId, link.targetNodeId, nodeOwners, frameById);
    if (!source || !target || source === target) continue;
    const pair = `${source}\u0000${target}`;
    if (pairs.has(pair)) continue;
    pairs.add(pair);
    edges.push({ id: `edge-${edges.length}-${source}-${target}`, sources: [source], targets: [target] });
  }
  return edges;
};

const resolveItemCollisions = (items, direction) => {
  const verticalLayers = direction === "TB" || direction === "BT";
  const placed = [];
  const ordered = [...items].sort((left, right) => Number(right.pinned) - Number(left.pinned));

  for (const item of ordered) {
    let collision = placed.find((candidate) => boxesOverlap(item, candidate, ITEM_SPACING / 2));
    let attempts = 0;
    while (collision && attempts < placed.length + 4) {
      if (verticalLayers) item.x = collision.x + collision.width + ITEM_SPACING;
      else item.y = collision.y + collision.height + ITEM_SPACING;
      collision = placed.find((candidate) => boxesOverlap(item, candidate, ITEM_SPACING / 2));
      attempts += 1;
    }
    placed.push(item);
  }
};

const compactContainerItems = (items, direction, sidePadding, topPadding, spacing) => {
  const vertical = direction === "TB" || direction === "BT";
  const ordered = [...items].sort((left, right) => {
    const primary = vertical ? left.y - right.y : left.x - right.x;
    if (Math.abs(primary) > 1) return primary;
    const secondary = vertical ? left.x - right.x : left.y - right.y;
    if (Math.abs(secondary) > 1) return secondary;
    return left.id.localeCompare(right.id);
  });
  let cursor = vertical ? topPadding : sidePadding;
  for (const item of ordered) {
    if (vertical) {
      item.x = sidePadding;
      item.y = cursor;
      cursor += item.height + spacing;
    } else {
      item.x = cursor;
      item.y = topPadding;
      cursor += item.width + spacing;
    }
  }
};

const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const routePorts = (source, target) => {
  const sourceCenter = centerOf(source);
  const targetCenter = centerOf(target);
  const horizontal = Math.abs(targetCenter.x - sourceCenter.x) > Math.abs(targetCenter.y - sourceCenter.y);
  if (horizontal) {
    const sign = targetCenter.x >= sourceCenter.x ? 1 : -1;
    return {
      source: { x: sourceCenter.x + sign * source.width / 2, y: sourceCenter.y },
      start: { x: sourceCenter.x + sign * (source.width / 2 + ROUTE_CLEARANCE), y: sourceCenter.y },
      end: { x: targetCenter.x - sign * (target.width / 2 + ROUTE_CLEARANCE), y: targetCenter.y },
      target: { x: targetCenter.x - sign * target.width / 2, y: targetCenter.y }
    };
  }
  const sign = targetCenter.y >= sourceCenter.y ? 1 : -1;
  return {
    source: { x: sourceCenter.x, y: sourceCenter.y + sign * source.height / 2 },
    start: { x: sourceCenter.x, y: sourceCenter.y + sign * (source.height / 2 + ROUTE_CLEARANCE) },
    end: { x: targetCenter.x, y: targetCenter.y - sign * (target.height / 2 + ROUTE_CLEARANCE) },
    target: { x: targetCenter.x, y: targetCenter.y - sign * target.height / 2 }
  };
};

const segmentIntersectsBox = (start, end, box) => {
  if (Math.abs(start.y - end.y) < 0.01) {
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    return start.y > box.y && start.y < box.y + box.height && right > box.x && left < box.x + box.width;
  }
  if (Math.abs(start.x - end.x) < 0.01) {
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);
    return start.x > box.x && start.x < box.x + box.width && bottom > box.y && top < box.y + box.height;
  }
  return false;
};

const segmentsCross = (leftStart, leftEnd, rightStart, rightEnd) => {
  const leftHorizontal = Math.abs(leftStart.y - leftEnd.y) < 0.01;
  const rightHorizontal = Math.abs(rightStart.y - rightEnd.y) < 0.01;
  if (leftHorizontal === rightHorizontal) return false;
  const horizontalStart = leftHorizontal ? leftStart : rightStart;
  const horizontalEnd = leftHorizontal ? leftEnd : rightEnd;
  const verticalStart = leftHorizontal ? rightStart : leftStart;
  const verticalEnd = leftHorizontal ? rightEnd : leftEnd;
  const crossing = { x: verticalStart.x, y: horizontalStart.y };
  const withinHorizontal =
    crossing.x > Math.min(horizontalStart.x, horizontalEnd.x) && crossing.x < Math.max(horizontalStart.x, horizontalEnd.x);
  const withinVertical =
    crossing.y > Math.min(verticalStart.y, verticalEnd.y) && crossing.y < Math.max(verticalStart.y, verticalEnd.y);
  return withinHorizontal && withinVertical;
};

const compressRoute = (points) => {
  const unique = points.filter(
    (point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y
  );
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true;
    const previous = unique[index - 1];
    const next = unique[index + 1];
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
  });
};

const routeMidpoint = (route) => {
  if (route.length < 2) return route[0] || { x: 0, y: 0 };
  const lengths = route.slice(1).map((point, index) =>
    Math.abs(point.x - route[index].x) + Math.abs(point.y - route[index].y)
  );
  const half = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let travelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (travelled + lengths[index] < half) {
      travelled += lengths[index];
      continue;
    }
    const start = route[index];
    const end = route[index + 1];
    const ratio = lengths[index] ? (half - travelled) / lengths[index] : 0;
    return { x: Math.round(start.x + (end.x - start.x) * ratio), y: Math.round(start.y + (end.y - start.y) * ratio) };
  }
  return route.at(-1);
};

const orthogonalRoute = (source, target, obstacles, existingRoutes) => {
  const ports = routePorts(source, target);
  const expandedObstacles = obstacles.map((box) => ({
    x: box.x - ROUTE_CLEARANCE,
    y: box.y - ROUTE_CLEARANCE,
    width: box.width + ROUTE_CLEARANCE * 2,
    height: box.height + ROUTE_CLEARANCE * 2
  }));
  const xs = [...new Set([ports.start.x, ports.end.x, ...expandedObstacles.flatMap((box) => [box.x, box.x + box.width])])].sort(
    (left, right) => left - right
  );
  const ys = [...new Set([ports.start.y, ports.end.y, ...expandedObstacles.flatMap((box) => [box.y, box.y + box.height])])].sort(
    (left, right) => left - right
  );
  const pointIsClear = (point) =>
    expandedObstacles.every(
      (box) => !(point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.height)
    );
  const segmentIsClear = (start, end) => expandedObstacles.every((box) => !segmentIntersectsBox(start, end, box));
  const keyFor = (xIndex, yIndex, heading) => `${xIndex}:${yIndex}:${heading}`;
  const startX = xs.indexOf(ports.start.x);
  const startY = ys.indexOf(ports.start.y);
  const endX = xs.indexOf(ports.end.x);
  const endY = ys.indexOf(ports.end.y);
  const queue = [{ xIndex: startX, yIndex: startY, heading: "start", cost: 0 }];
  const costs = new Map([[keyFor(startX, startY, "start"), 0]]);
  const previous = new Map();
  let finishKey = null;

  while (queue.length) {
    queue.sort((left, right) => left.cost - right.cost);
    const current = queue.shift();
    const currentKey = keyFor(current.xIndex, current.yIndex, current.heading);
    if (current.cost !== costs.get(currentKey)) continue;
    if (current.xIndex === endX && current.yIndex === endY) {
      finishKey = currentKey;
      break;
    }
    const currentPoint = { x: xs[current.xIndex], y: ys[current.yIndex] };
    const candidates = [
      { xIndex: current.xIndex - 1, yIndex: current.yIndex, heading: "horizontal" },
      { xIndex: current.xIndex + 1, yIndex: current.yIndex, heading: "horizontal" },
      { xIndex: current.xIndex, yIndex: current.yIndex - 1, heading: "vertical" },
      { xIndex: current.xIndex, yIndex: current.yIndex + 1, heading: "vertical" }
    ];
    for (const candidate of candidates) {
      if (candidate.xIndex < 0 || candidate.xIndex >= xs.length || candidate.yIndex < 0 || candidate.yIndex >= ys.length) continue;
      const nextPoint = { x: xs[candidate.xIndex], y: ys[candidate.yIndex] };
      if (!pointIsClear(nextPoint) || !segmentIsClear(currentPoint, nextPoint)) continue;
      const distance = Math.abs(nextPoint.x - currentPoint.x) + Math.abs(nextPoint.y - currentPoint.y);
      const bend = current.heading !== "start" && current.heading !== candidate.heading ? 36 : 0;
      let crossingPenalty = 0;
      for (const route of existingRoutes) {
        for (let index = 1; index < route.length; index += 1) {
          if (segmentsCross(currentPoint, nextPoint, route[index - 1], route[index])) crossingPenalty += 180;
        }
      }
      const nextCost = current.cost + distance + bend + crossingPenalty;
      const nextKey = keyFor(candidate.xIndex, candidate.yIndex, candidate.heading);
      if (nextCost >= (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(nextKey, nextCost);
      previous.set(nextKey, currentKey);
      queue.push({ ...candidate, cost: nextCost });
    }
  }

  let middle = [];
  if (finishKey) {
    let key = finishKey;
    while (key) {
      const [xIndex, yIndex] = key.split(":").map(Number);
      middle.push({ x: xs[xIndex], y: ys[yIndex] });
      key = previous.get(key);
    }
    middle.reverse();
  } else {
    const firstCorner = { x: ports.start.x, y: ports.end.y };
    const secondCorner = { x: ports.end.x, y: ports.start.y };
    middle = segmentIsClear(ports.start, firstCorner) && segmentIsClear(firstCorner, ports.end)
      ? [ports.start, firstCorner, ports.end]
      : [ports.start, secondCorner, ports.end];
  }
  return compressRoute([ports.source, ports.start, ...middle, ports.end, ports.target]);
};

const runComposedLayout = async (workspace, options = {}) => {
  const nextWorkspace = structuredClone(workspace);
  const activeTree = options.treeId
    ? nextWorkspace.trees.find((tree) => tree.id === options.treeId)
    : nextWorkspace.trees[0];
  if (!activeTree) return nextWorkspace;
  const canvas = nextWorkspace.canvases.find((candidate) => candidate.id === activeTree.canvasId);
  if (!canvas) return nextWorkspace;

  const trees = nextWorkspace.trees.filter((tree) => tree.canvasId === canvas.id);
  const nodeOwners = new Map();
  for (const tree of trees) {
    for (const node of tree.nodes || []) nodeOwners.set(node.id, { node, tree });
  }
  const links = trees.flatMap((tree) => tree.links || []);
  const frameById = new Map(canvas.frames.map((frame) => [frame.id, frame]));
  const direction = activeTree.layout?.direction || getDiagramDefinition(activeTree.type)?.defaultDirection || "TB";
  const spacingNodeNode = activeTree.layout?.settings?.spacingNodeNode || ITEM_SPACING;
  const spacingLayer = activeTree.layout?.settings?.spacingLayer || LAYER_SPACING;
  const elk = new ELK();

  const layoutContainer = async (frameId, isRoot = false) => {
    const frame = frameById.get(frameId);
    const childResults = new Map();
    for (const childFrameId of frame.childFrameIds || []) {
      childResults.set(childFrameId, await layoutContainer(childFrameId, false));
    }

    const items = [];
    for (const nodeId of frame.nodeIds || []) {
      if (!nodeOwners.has(nodeId)) continue;
      const size = nodeSize(nodeOwners, nodeId);
      const previous = previousNodeBox(nodeOwners, nodeId);
      items.push({ id: nodeId, type: "node", ...size, pinned: Boolean(previous?.pinned) });
    }
    for (const childFrameId of frame.childFrameIds || []) {
      const result = childResults.get(childFrameId);
      const previous = canvas.layout?.frames?.[childFrameId];
      items.push({
        id: childFrameId,
        type: "frame",
        width: result.width,
        height: result.height,
        pinned: Boolean(previous?.pinned)
      });
    }

    const sidePadding = isRoot ? ROOT_MARGIN : FRAME_SIDE_PADDING;
    const topPadding = isRoot ? ROOT_MARGIN : FRAME_TOP_PADDING;
    const bottomPadding = isRoot ? ROOT_MARGIN : FRAME_BOTTOM_PADDING;
    let elkChildren = [];
    if (items.length) {
      const graph = {
        id: `container-${frameId}`,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": elkDirection(direction),
          "elk.spacing.nodeNode": String(spacingNodeNode),
          "elk.layered.spacing.nodeNodeBetweenLayers": String(spacingLayer),
          "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
          "elk.edgeRouting": "ORTHOGONAL"
        },
        children: items.map(({ id, width, height }) => ({ id, width, height })),
        edges: collapsedEdges(frameId, links, nodeOwners, frameById)
      };
      const laidOut = await elk.layout(graph);
      elkChildren = laidOut.children || [];
    }

    const elkPositions = new Map(elkChildren.map((child) => [child.id, child]));
    const previousParent = isRoot ? null : canvas.layout?.frames?.[frameId];
    for (const item of items) {
      const laidOut = elkPositions.get(item.id) || { x: 0, y: 0 };
      item.x = Math.round((laidOut.x || 0) + sidePadding);
      item.y = Math.round((laidOut.y || 0) + topPadding);
    }
    if (!isRoot && frame.kind === "container") {
      compactContainerItems(items, direction, sidePadding, topPadding, spacingNodeNode);
    }
    for (const item of items) {
      if (!item.pinned) continue;

      const previous = item.type === "frame" ? canvas.layout?.frames?.[item.id] : previousNodeBox(nodeOwners, item.id);
      if (!previous) continue;
      item.x = Math.max(isRoot ? 24 : sidePadding, Math.round(previous.x - (previousParent?.x || 0)));
      item.y = Math.max(isRoot ? 24 : topPadding, Math.round(previous.y - (previousParent?.y || 0)));
    }
    resolveItemCollisions(items, direction);

    const nodeLayouts = {};
    const frameLayouts = {};
    for (const item of items) {
      if (item.type === "node") {
        const previous = previousNodeBox(nodeOwners, item.id) || {};
        nodeLayouts[item.id] = {
          ...previous,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          pinned: item.pinned,
          layoutSource: item.pinned ? "manual" : "auto"
        };
        continue;
      }

      const childResult = childResults.get(item.id);
      Object.assign(nodeLayouts, translateBoxMap(childResult.nodeLayouts, item.x, item.y));
      Object.assign(frameLayouts, translateBoxMap(childResult.frameLayouts, item.x, item.y));
    }

    const contentRight = items.length ? Math.max(...items.map((item) => item.x + item.width)) : sidePadding;
    const contentBottom = items.length ? Math.max(...items.map((item) => item.y + item.height)) : topPadding;
    const previousFrame = canvas.layout?.frames?.[frameId] || {};
    const width = isRoot
      ? contentRight + sidePadding
      : Math.max(MIN_FRAME_WIDTH, contentRight + FRAME_SIDE_PADDING, previousFrame.pinned ? previousFrame.width || 0 : 0);
    const height = isRoot
      ? contentBottom + bottomPadding
      : Math.max(MIN_FRAME_HEIGHT, contentBottom + FRAME_BOTTOM_PADDING, previousFrame.pinned ? previousFrame.height || 0 : 0);

    if (!isRoot) {
      frameLayouts[frameId] = {
        ...previousFrame,
        x: 0,
        y: 0,
        width,
        height,
        pinned: Boolean(previousFrame.pinned),
        layoutSource: previousFrame.pinned ? "manual" : "auto"
      };
    }

    return { width, height, nodeLayouts, frameLayouts };
  };

  const result = await layoutContainer(canvas.rootFrameId, true);
  canvas.layout = { ...(canvas.layout || {}), frames: result.frameLayouts };
  canvas.updatedAt = new Date().toISOString();

  const routedRoutes = [];
  const allNodeBoxes = Object.entries(result.nodeLayouts);
  for (const tree of trees) {
    const nextNodeLayout = {};
    for (const node of tree.nodes || []) {
      if (result.nodeLayouts[node.id]) nextNodeLayout[node.id] = result.nodeLayouts[node.id];
    }
    const nextLinkLayout = {};
    for (const link of tree.links || []) {
      const source = nextNodeLayout[link.sourceNodeId];
      const target = nextNodeLayout[link.targetNodeId];
      const previous = tree.layout?.links?.[link.id] || {};
      const obstacles = allNodeBoxes
        .filter(([nodeId]) => nodeId !== link.sourceNodeId && nodeId !== link.targetNodeId)
        .map(([, box]) => box);
      const route = source && target ? orthogonalRoute(source, target, obstacles, routedRoutes) : previous.route || [];
      if (route.length) routedRoutes.push(route);
      nextLinkLayout[link.id] = {
        ...previous,
        route,
        routeSource: "auto",
        labelPosition:
          route.length
            ? routeMidpoint(route)
            : previous.labelPosition || { x: 0, y: 0 }
      };
    }
    tree.layout = {
      ...(tree.layout || {}),
      engine: "elk-composed",
      direction,
      lastRunAt: new Date().toISOString(),
      nodes: nextNodeLayout,
      links: nextLinkLayout
    };
    tree.updatedAt = new Date().toISOString();
  }
  nextWorkspace.updatedAt = new Date().toISOString();
  return nextWorkspace;
};

const validateComposedGeometry = (workspace, canvasId = null) => {
  const canvas = canvasId
    ? workspace.canvases?.find((candidate) => candidate.id === canvasId)
    : workspace.canvases?.[0];
  if (!canvas) return [{ code: "CANVAS_MISSING", message: "Canvas is missing" }];

  const trees = (workspace.trees || []).filter((tree) => tree.canvasId === canvas.id);
  const nodes = trees.flatMap((tree) => tree.nodes.map((node) => ({ node, box: tree.layout?.nodes?.[node.id] })));
  const frameById = new Map(canvas.frames.map((frame) => [frame.id, frame]));
  const finiteFrames = canvas.frames.filter((frame) => frame.id !== canvas.rootFrameId);
  const issues = [];
  const isFrameAncestor = (ancestorId, descendantId) => {
    let frame = frameById.get(descendantId);
    while (frame) {
      if (frame.id === ancestorId) return true;
      frame = frameById.get(frame.parentFrameId);
    }
    return false;
  };

  for (const { node, box } of nodes) {
    if (!box) {
      issues.push({ code: "NODE_LAYOUT_MISSING", nodeId: node.id });
      continue;
    }
    const ownerFrame = frameById.get(node.frameId);
    if (ownerFrame && ownerFrame.id !== canvas.rootFrameId) {
      const frameBox = canvas.layout?.frames?.[ownerFrame.id];
      if (!frameBox || !boxContains(frameBox, box)) {
        issues.push({ code: "NODE_OUTSIDE_FRAME", nodeId: node.id, frameId: ownerFrame.id });
      }
    }
    for (const frame of finiteFrames) {
      if (isFrameAncestor(frame.id, node.frameId)) continue;
      const frameBox = canvas.layout?.frames?.[frame.id];
      if (frameBox && boxesOverlap(box, frameBox)) {
        issues.push({ code: "NODE_OVERLAPS_UNRELATED_FRAME", nodeId: node.id, frameId: frame.id });
      }
    }
  }

  const nodeBoxById = new Map(nodes.map(({ node, box }) => [node.id, box]));
  for (const tree of trees) {
    for (const link of tree.links || []) {
      const route = tree.layout?.links?.[link.id]?.route || [];
      if (route.length < 2) {
        issues.push({ code: "LINK_ROUTE_MISSING", linkId: link.id });
        continue;
      }
      for (const [nodeId, box] of nodeBoxById) {
        if (!box || nodeId === link.sourceNodeId || nodeId === link.targetNodeId) continue;
        for (let index = 1; index < route.length; index += 1) {
          if (!segmentIntersectsBox(route[index - 1], route[index], box)) continue;
          issues.push({ code: "LINK_CROSSES_NODE", linkId: link.id, nodeId });
          break;
        }
      }
    }
  }

  for (let index = 0; index < nodes.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
      if (nodes[index].box && nodes[otherIndex].box && boxesOverlap(nodes[index].box, nodes[otherIndex].box)) {
        issues.push({ code: "NODE_OVERLAP", nodeIds: [nodes[index].node.id, nodes[otherIndex].node.id] });
      }
    }
  }

  for (const frame of finiteFrames) {
    const box = canvas.layout?.frames?.[frame.id];
    if (!box) {
      issues.push({ code: "FRAME_LAYOUT_MISSING", frameId: frame.id });
      continue;
    }
    if (frame.parentFrameId && frame.parentFrameId !== canvas.rootFrameId) {
      const parentBox = canvas.layout?.frames?.[frame.parentFrameId];
      if (!parentBox || !boxContains(parentBox, box)) {
        issues.push({ code: "FRAME_OUTSIDE_PARENT", frameId: frame.id, parentFrameId: frame.parentFrameId });
      }
    }
  }

  for (let index = 0; index < finiteFrames.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < finiteFrames.length; otherIndex += 1) {
      const left = finiteFrames[index];
      const right = finiteFrames[otherIndex];
      if (isFrameAncestor(left.id, right.id) || isFrameAncestor(right.id, left.id)) continue;
      const leftBox = canvas.layout?.frames?.[left.id];
      const rightBox = canvas.layout?.frames?.[right.id];
      if (leftBox && rightBox && boxesOverlap(leftBox, rightBox)) {
        issues.push({ code: "UNRELATED_FRAME_OVERLAP", frameIds: [left.id, right.id] });
      }
    }
  }
  return issues;
};

module.exports = {
  runComposedLayout,
  validateComposedGeometry,
  boxesOverlap,
  boxContains
};
