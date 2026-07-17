const { getDiagramDefinition } = require("./diagram-registry");
const { createElkLayeredEngine } = require("./layout-engines/elk-layered-engine");
const { initialDocumentId } = require("./document-view");

const FRAME_SIDE_PADDING = 28;
const FRAME_TOP_PADDING = 58;
const FRAME_BOTTOM_PADDING = 28;
const ROOT_MARGIN = 72;
const ITEM_SPACING = 48;
const LAYER_SPACING = 96;
const MIN_FRAME_WIDTH = 300;
const MIN_FRAME_HEIGHT = 180;
const COLLAPSED_FRAME_WIDTH = 190;
const COLLAPSED_FRAME_HEIGHT = 76;
const ROUTE_CLEARANCE = 14;
const PORT_STUB_LENGTH = 52;
const PORT_EDGE_MARGIN = 18;
const PORT_MIN_SPACING = 18;
const STABILITY_DISTANCE = 120;
const LONG_LINK_DISTANCE = 480;
const MINIMUM_LAYOUT_IMPROVEMENT = 0.15;

const QUALITY_WEIGHTS = Object.freeze({
  crossing: 750,
  obstacle: 1100,
  directionException: 500,
  averageLength: 0.35,
  maximumLength: 0.9,
  longLinkSquared: 1 / 60,
  emptyRatio: 200,
  averageMovementExcess: 1.5,
  maximumMovementExcess: 1.5
});

const boxesOverlap = (left, right, gap = 0) =>
  left.x < right.x + right.width + gap &&
  left.x + left.width + gap > right.x &&
  left.y < right.y + right.height + gap &&
  left.y + left.height + gap > right.y;

const collectionHasOverlaps = (boxes, gap = 0) => {
  for (let index = 0; index < boxes.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < boxes.length; otherIndex += 1) {
      if (boxesOverlap(boxes[index], boxes[otherIndex], gap)) return true;
    }
  }
  return false;
};

const boxContains = (outer, inner, tolerance = 0.5) =>
  inner.x >= outer.x - tolerance &&
  inner.y >= outer.y - tolerance &&
  inner.x + inner.width <= outer.x + outer.width + tolerance &&
  inner.y + inner.height <= outer.y + outer.height + tolerance;

const translateBoxMap = (boxes, offsetX, offsetY) =>
  Object.fromEntries(
    Object.entries(boxes).map(([id, box]) => [id, { ...box, x: box.x + offsetX, y: box.y + offsetY }])
  );

const collapsedAncestorFrameId = (frameId, frameById, includeSelf = true) => {
  let frame = frameById.get(frameId);
  let collapsedFrameId = null;
  if (!includeSelf) frame = frameById.get(frame?.parentFrameId);
  while (frame) {
    if (frame.collapsed) collapsedFrameId = frame.id;
    frame = frameById.get(frame.parentFrameId);
  }
  return collapsedFrameId;
};

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

const compactDisconnectedItems = (items, sidePadding, topPadding, spacing) => {
  const ordered = [...items].sort((left, right) => {
    const verticalDifference = left.y - right.y;
    if (Math.abs(verticalDifference) > 1) return verticalDifference;
    const horizontalDifference = left.x - right.x;
    if (Math.abs(horizontalDifference) > 1) return horizontalDifference;
    return left.id.localeCompare(right.id);
  });
  const columnCount = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
  const columnWidths = Array.from({ length: columnCount }, () => 0);
  const rowHeights = [];
  ordered.forEach((item, index) => {
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    columnWidths[column] = Math.max(columnWidths[column], item.width);
    rowHeights[row] = Math.max(rowHeights[row] || 0, item.height);
  });
  const columnOffsets = columnWidths.map((_, index) =>
    sidePadding + columnWidths.slice(0, index).reduce((sum, width) => sum + width + spacing, 0)
  );
  const rowOffsets = rowHeights.map((_, index) =>
    topPadding + rowHeights.slice(0, index).reduce((sum, height) => sum + height + spacing, 0)
  );
  ordered.forEach((item, index) => {
    item.x = columnOffsets[index % columnCount];
    item.y = rowOffsets[Math.floor(index / columnCount)];
  });
};

const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const directionVector = (direction) =>
  ({
    TB: { x: 0, y: 1 },
    BT: { x: 0, y: -1 },
    LR: { x: 1, y: 0 },
    RL: { x: -1, y: 0 }
  })[direction] || { x: 0, y: 1 };

const effectiveDirectionVector = (source, target, direction) => {
  const preferred = directionVector(direction);
  const sourceCenter = centerOf(source);
  const targetCenter = centerOf(target);
  const delta = { x: targetCenter.x - sourceCenter.x, y: targetCenter.y - sourceCenter.y };
  if (delta.x * preferred.x + delta.y * preferred.y > 0.0001) return preferred;
  if (Math.abs(delta.x) > Math.abs(delta.y)) return { x: delta.x >= 0 ? 1 : -1, y: 0 };
  return { x: 0, y: delta.y >= 0 ? 1 : -1 };
};

const pointOnBoxSide = (box, outward, fraction = 0.5) => {
  const center = centerOf(box);
  return {
    x: outward.x ? center.x + outward.x * box.width / 2 : box.x + box.width * fraction,
    y: outward.y ? center.y + outward.y * box.height / 2 : box.y + box.height * fraction
  };
};

const routePorts = (source, target, direction, assignment = {}) => {
  const vector = effectiveDirectionVector(source, target, direction);
  const sourcePoint = pointOnBoxSide(source, vector, assignment.sourceFraction);
  const targetPoint = pointOnBoxSide(
    target,
    { x: -vector.x, y: -vector.y },
    assignment.targetFraction
  );
  return {
    source: sourcePoint,
    start: {
      x: sourcePoint.x + vector.x * PORT_STUB_LENGTH,
      y: sourcePoint.y + vector.y * PORT_STUB_LENGTH
    },
    end: {
      x: targetPoint.x - vector.x * PORT_STUB_LENGTH,
      y: targetPoint.y - vector.y * PORT_STUB_LENGTH
    },
    target: targetPoint
  };
};

const distributedPortAssignments = (links, nodeLayouts, direction) => {
  const groups = new Map();
  const assignments = new Map(links.map((link) => [link.id, {}]));
  const addEndpoint = (link, role, nodeId, otherNodeId, outward) => {
    const box = nodeLayouts[nodeId];
    const otherBox = nodeLayouts[otherNodeId];
    if (!box || !otherBox) return;
    const key = `${nodeId}:${outward.x}:${outward.y}`;
    const entries = groups.get(key) || [];
    entries.push({ linkId: link.id, role, box, otherCenter: centerOf(otherBox), outward });
    groups.set(key, entries);
  };

  for (const link of links) {
    const source = nodeLayouts[link.sourceNodeId];
    const target = nodeLayouts[link.targetNodeId];
    if (!source || !target) continue;
    const vector = effectiveDirectionVector(source, target, direction);
    addEndpoint(link, "source", link.sourceNodeId, link.targetNodeId, vector);
    addEndpoint(link, "target", link.targetNodeId, link.sourceNodeId, { x: -vector.x, y: -vector.y });
  }

  for (const entries of groups.values()) {
    const variesOnY = Boolean(entries[0].outward.x);
    entries.sort((left, right) => {
      const difference = variesOnY
        ? left.otherCenter.y - right.otherCenter.y
        : left.otherCenter.x - right.otherCenter.x;
      return Math.abs(difference) > 0.001 ? difference : left.linkId.localeCompare(right.linkId);
    });
    const box = entries[0].box;
    const dimension = variesOnY ? box.height : box.width;
    const origin = variesOnY ? box.y : box.x;
    const margin = Math.min(PORT_EDGE_MARGIN, dimension / 4);
    const lower = margin;
    const upper = dimension - margin;
    const available = Math.max(0, upper - lower);
    const spacing = entries.length > 1
      ? Math.min(PORT_MIN_SPACING, available / (entries.length - 1))
      : 0;
    const positions = entries.map((entry) => {
      const projected = (variesOnY ? entry.otherCenter.y : entry.otherCenter.x) - origin;
      return Math.max(lower, Math.min(upper, projected));
    });

    for (let index = 1; index < positions.length; index += 1) {
      positions[index] = Math.max(positions[index], positions[index - 1] + spacing);
    }
    if (positions.length && positions.at(-1) > upper) {
      positions[positions.length - 1] = upper;
      for (let index = positions.length - 2; index >= 0; index -= 1) {
        positions[index] = Math.min(positions[index], positions[index + 1] - spacing);
      }
    }
    if (positions.length && positions[0] < lower) {
      const shift = lower - positions[0];
      positions.forEach((position, index) => {
        positions[index] = position + shift;
      });
    }
    entries.forEach((entry, index) => {
      assignments.get(entry.linkId)[`${entry.role}Fraction`] = positions[index] / dimension;
    });
  }

  return assignments;
};

const segmentIntersectsBox = (start, end, box) => {
  const intervals = [];
  for (const axis of ["x", "y"]) {
    const delta = end[axis] - start[axis];
    const lower = box[axis];
    const upper = box[axis] + (axis === "x" ? box.width : box.height);
    if (Math.abs(delta) < 0.0001) {
      if (start[axis] <= lower || start[axis] >= upper) return false;
      intervals.push([0, 1]);
      continue;
    }
    const first = (lower - start[axis]) / delta;
    const second = (upper - start[axis]) / delta;
    intervals.push([Math.min(first, second), Math.max(first, second)]);
  }
  const entry = Math.max(0, intervals[0][0], intervals[1][0]);
  const exit = Math.min(1, intervals[0][1], intervals[1][1]);
  return exit - entry > 0.0001;
};

const segmentsCross = (leftStart, leftEnd, rightStart, rightEnd) => {
  const leftDelta = { x: leftEnd.x - leftStart.x, y: leftEnd.y - leftStart.y };
  const rightDelta = { x: rightEnd.x - rightStart.x, y: rightEnd.y - rightStart.y };
  const denominator = leftDelta.x * rightDelta.y - leftDelta.y * rightDelta.x;
  if (Math.abs(denominator) < 0.0001) return false;
  const offset = { x: rightStart.x - leftStart.x, y: rightStart.y - leftStart.y };
  const leftRatio = (offset.x * rightDelta.y - offset.y * rightDelta.x) / denominator;
  const rightRatio = (offset.x * leftDelta.y - offset.y * leftDelta.x) / denominator;
  return leftRatio > 0.0001 && leftRatio < 0.9999 && rightRatio > 0.0001 && rightRatio < 0.9999;
};

const longestSinkRanks = (itemIds, edges) => {
  const outgoing = new Map(itemIds.map((id) => [id, []]));
  const incomingCount = new Map(itemIds.map((id) => [id, 0]));
  for (const edge of edges) {
    const source = edge.sources[0];
    const target = edge.targets[0];
    outgoing.get(source)?.push(target);
    if (incomingCount.has(target)) incomingCount.set(target, incomingCount.get(target) + 1);
  }
  const itemOrder = new Map(itemIds.map((id, index) => [id, index]));
  const queue = itemIds.filter((id) => incomingCount.get(id) === 0);
  const topologicalOrder = [];
  const sortQueue = () => queue.sort((left, right) => itemOrder.get(left) - itemOrder.get(right));
  sortQueue();
  while (queue.length) {
    const id = queue.shift();
    topologicalOrder.push(id);
    for (const target of outgoing.get(id) || []) {
      incomingCount.set(target, incomingCount.get(target) - 1);
      if (incomingCount.get(target) === 0) {
        queue.push(target);
        sortQueue();
      }
    }
  }
  if (topologicalOrder.length !== itemIds.length) return new Map();
  const ranks = new Map();
  for (const id of topologicalOrder.reverse()) {
    ranks.set(id, Math.max(0, ...(outgoing.get(id) || []).map((target) => (ranks.get(target) || 0) + 1)));
  }
  return ranks;
};

const breakCyclesForLayout = (itemIds, edges) => {
  const itemOrder = new Map(itemIds.map((id, index) => [id, index]));
  const remaining = new Set(itemIds);
  const left = [];
  const right = [];
  const degrees = (id) => {
    let incoming = 0;
    let outgoing = 0;
    for (const edge of edges) {
      const source = edge.sources[0];
      const target = edge.targets[0];
      if (!remaining.has(source) || !remaining.has(target)) continue;
      if (source === id) outgoing += 1;
      if (target === id) incoming += 1;
    }
    return { incoming, outgoing };
  };
  const byOriginalOrder = (first, second) => itemOrder.get(first) - itemOrder.get(second);

  while (remaining.size) {
    const sinks = [...remaining].filter((id) => degrees(id).outgoing === 0).sort(byOriginalOrder);
    if (sinks.length) {
      for (const id of sinks) {
        remaining.delete(id);
        right.unshift(id);
      }
      continue;
    }
    const sources = [...remaining].filter((id) => degrees(id).incoming === 0).sort(byOriginalOrder);
    if (sources.length) {
      for (const id of sources) {
        remaining.delete(id);
        left.push(id);
      }
      continue;
    }
    const pivot = [...remaining].sort((first, second) => {
      const firstDegrees = degrees(first);
      const secondDegrees = degrees(second);
      const scoreDifference =
        secondDegrees.outgoing - secondDegrees.incoming - (firstDegrees.outgoing - firstDegrees.incoming);
      return scoreDifference || byOriginalOrder(first, second);
    })[0];
    remaining.delete(pivot);
    left.push(pivot);
  }

  const order = new Map([...left, ...right].map((id, index) => [id, index]));
  const reversedEdgeIds = [];
  const layoutEdges = edges.map((edge) => {
    const source = edge.sources[0];
    const target = edge.targets[0];
    if (order.get(source) < order.get(target)) return edge;
    reversedEdgeIds.push(edge.id);
    return { ...edge, sources: [target], targets: [source] };
  });
  return { edges: layoutEdges, reversed: reversedEdgeIds.length, reversedEdgeIds };
};

const relativeMovement = (children, referenceChildren) => {
  if (!referenceChildren?.length || referenceChildren.length !== children.length) {
    return { average: 0, maximum: 0, averageExcess: 0, maximumExcess: 0 };
  }
  const currentById = new Map(referenceChildren.map((child) => [child.id, centerOf(child)]));
  const candidateCenters = children.map((child) => ({ id: child.id, ...centerOf(child) }));
  if (candidateCenters.some((point) => !currentById.has(point.id))) {
    return { average: 0, maximum: 0, averageExcess: 0, maximumExcess: 0 };
  }
  const candidateCentroid = candidateCenters.reduce(
    (sum, point) => ({ x: sum.x + point.x / candidateCenters.length, y: sum.y + point.y / candidateCenters.length }),
    { x: 0, y: 0 }
  );
  const currentCentroid = [...currentById.values()].reduce(
    (sum, point) => ({ x: sum.x + point.x / currentById.size, y: sum.y + point.y / currentById.size }),
    { x: 0, y: 0 }
  );
  const distances = candidateCenters.map((point) => {
    const current = currentById.get(point.id);
    return Math.hypot(
      (point.x - candidateCentroid.x) - (current.x - currentCentroid.x),
      (point.y - candidateCentroid.y) - (current.y - currentCentroid.y)
    );
  });
  const excesses = distances.map((distance) => Math.max(0, distance - STABILITY_DISTANCE));
  return {
    average: distances.reduce((sum, distance) => sum + distance, 0) / distances.length,
    maximum: Math.max(...distances, 0),
    averageExcess: excesses.reduce((sum, distance) => sum + distance, 0) / excesses.length,
    maximumExcess: Math.max(...excesses, 0)
  };
};

const candidateQuality = (items, children, edges, direction, referenceChildren = null) => {
  const boxes = new Map(
    children.map((child) => [child.id, { x: child.x || 0, y: child.y || 0, width: child.width, height: child.height }])
  );
  const candidateLinks = edges.map((edge) => ({
    id: edge.id,
    sourceNodeId: edge.sources[0],
    targetNodeId: edge.targets[0]
  }));
  const portAssignments = distributedPortAssignments(candidateLinks, Object.fromEntries(boxes), direction);
  const segments = candidateLinks
    .map((link) => {
      const sourceId = link.sourceNodeId;
      const targetId = link.targetNodeId;
      const source = boxes.get(sourceId);
      const target = boxes.get(targetId);
      if (!source || !target) return null;
      const ports = routePorts(source, target, direction, portAssignments.get(link.id));
      const preferred = directionVector(direction);
      const sourceCenter = centerOf(source);
      const targetCenter = centerOf(target);
      return {
        sourceId,
        targetId,
        start: ports.source,
        end: ports.target,
        directionException:
          (targetCenter.x - sourceCenter.x) * preferred.x + (targetCenter.y - sourceCenter.y) * preferred.y <= 0.0001
      };
    })
    .filter(Boolean);
  let crossings = 0;
  for (let index = 0; index < segments.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < segments.length; otherIndex += 1) {
      const left = segments[index];
      const right = segments[otherIndex];
      if ([left.sourceId, left.targetId].some((id) => id === right.sourceId || id === right.targetId)) continue;
      if (segmentsCross(left.start, left.end, right.start, right.end)) crossings += 1;
    }
  }
  let obstacles = 0;
  for (const segment of segments) {
    for (const [itemId, box] of boxes) {
      if (itemId === segment.sourceId || itemId === segment.targetId) continue;
      const expanded = {
        x: box.x - ROUTE_CLEARANCE,
        y: box.y - ROUTE_CLEARANCE,
        width: box.width + ROUTE_CLEARANCE * 2,
        height: box.height + ROUTE_CLEARANCE * 2
      };
      if (segmentIntersectsBox(segment.start, segment.end, expanded)) obstacles += 1;
    }
  }
  const left = children.length ? Math.min(...children.map((child) => child.x || 0)) : 0;
  const top = children.length ? Math.min(...children.map((child) => child.y || 0)) : 0;
  const right = children.length ? Math.max(...children.map((child) => (child.x || 0) + child.width)) : 0;
  const bottom = children.length ? Math.max(...children.map((child) => (child.y || 0) + child.height)) : 0;
  const lengths = segments.map((segment) => Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y));
  const length = lengths.reduce((sum, segmentLength) => sum + segmentLength, 0);
  const maximumLength = Math.max(...lengths, 0);
  const averageLength = lengths.length ? length / lengths.length : 0;
  const area = Math.max(0, (right - left) * (bottom - top));
  const occupiedArea = children.reduce((sum, child) => sum + child.width * child.height, 0);
  const emptyArea = Math.max(0, area - occupiedArea);
  const emptyRatio = occupiedArea ? emptyArea / occupiedArea : 0;
  const movement = relativeMovement(children, referenceChildren);
  const directionExceptions = segments.filter((segment) => segment.directionException).length;
  const longLinkExcess = Math.max(0, maximumLength - LONG_LINK_DISTANCE);
  const score =
    crossings * QUALITY_WEIGHTS.crossing +
    obstacles * QUALITY_WEIGHTS.obstacle +
    directionExceptions * QUALITY_WEIGHTS.directionException +
    averageLength * QUALITY_WEIGHTS.averageLength +
    maximumLength * QUALITY_WEIGHTS.maximumLength +
    longLinkExcess * longLinkExcess * QUALITY_WEIGHTS.longLinkSquared +
    emptyRatio * QUALITY_WEIGHTS.emptyRatio +
    movement.averageExcess * QUALITY_WEIGHTS.averageMovementExcess +
    movement.maximumExcess * QUALITY_WEIGHTS.maximumMovementExcess;
  return {
    crossings,
    obstacles,
    directionExceptions,
    length: Math.round(length),
    averageLength: Math.round(averageLength),
    maximumLength: Math.round(maximumLength),
    area: Math.round(area),
    emptyArea: Math.round(emptyArea),
    emptyRatio: Math.round(emptyRatio * 1000) / 1000,
    averageRelativeMovement: Math.round(movement.average),
    maximumRelativeMovement: Math.round(movement.maximum),
    score: Math.round(score * 100) / 100
  };
};

const compareCandidateQuality = (left, right) => {
  for (const key of ["score", "crossings", "obstacles", "maximumLength", "length", "area"]) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }
  return 0;
};

const selectLayoutCandidate = async (
  engine,
  problem,
  items,
  edges,
  direction,
  currentChildren = null,
  maximumDirectionExceptions = Number.POSITIVE_INFINITY
) => {
  const candidates = await engine.generateCandidates(problem);
  let best = null;
  let bestFeasible = null;
  for (const generated of candidates) {
    const quality = candidateQuality(items, generated.children, edges, direction, currentChildren);
    const candidate = {
      laidOut: { children: generated.children },
      quality,
      config: generated.config
    };
    if (!best || compareCandidateQuality(candidate.quality, best.quality) < 0) best = candidate;
    if (
      quality.directionExceptions <= maximumDirectionExceptions &&
      (!bestFeasible || compareCandidateQuality(candidate.quality, bestFeasible.quality) < 0)
    ) {
      bestFeasible = candidate;
    }
  }
  best = bestFeasible || best;
  if (!currentChildren?.length) return { ...best, candidates: candidates.length };

  const currentQuality = candidateQuality(items, currentChildren, edges, direction, currentChildren);
  const currentIsFeasible = currentQuality.directionExceptions <= maximumDirectionExceptions;
  const improvement = currentQuality.score
    ? (currentQuality.score - best.quality.score) / currentQuality.score
    : 0;
  if (currentIsFeasible && improvement < MINIMUM_LAYOUT_IMPROVEMENT) {
    return {
      laidOut: { children: currentChildren },
      quality: currentQuality,
      config: {
        placement: "CURRENT",
        seed: null,
        preserved: true,
        improvement: Math.round(improvement * 1000) / 1000,
        baselineScore: currentQuality.score,
        selectedScore: currentQuality.score
      },
      candidates: candidates.length
    };
  }
  return {
    ...best,
    config: {
      ...best.config,
      preserved: false,
      forcedByDirection: !currentIsFeasible,
      improvement: Math.round(improvement * 1000) / 1000,
      baselineScore: currentQuality.score,
      selectedScore: best.quality.score
    },
    candidates: candidates.length
  };
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
  const lengths = route.slice(1).map((point, index) => Math.hypot(point.x - route[index].x, point.y - route[index].y));
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

const orthogonalRoute = (source, target, obstacles, existingRoutes, direction, link, portAssignment) => {
  const ports = routePorts(source, target, direction, portAssignment);
  const expandedObstacles = obstacles.map((box) => ({
    x: box.x - ROUTE_CLEARANCE,
    y: box.y - ROUTE_CLEARANCE,
    width: box.width + ROUTE_CLEARANCE * 2,
    height: box.height + ROUTE_CLEARANCE * 2
  }));
  const fitPerpendicularStub = (endpoint, proposed) => {
    const vector = {
      x: Math.sign(proposed.x - endpoint.x),
      y: Math.sign(proposed.y - endpoint.y)
    };
    for (let distance = PORT_STUB_LENGTH; distance >= 0; distance -= 2) {
      const candidate = {
        x: endpoint.x + vector.x * distance,
        y: endpoint.y + vector.y * distance
      };
      if (expandedObstacles.every((box) => !segmentIntersectsBox(endpoint, candidate, box))) return candidate;
    }
    return endpoint;
  };
  ports.start = fitPerpendicularStub(ports.source, ports.start);
  ports.end = fitPerpendicularStub(ports.target, ports.end);
  const directRoute = [ports.source, ports.target];
  const directIsClear = expandedObstacles.every((box) => !segmentIntersectsBox(ports.source, ports.target, box));
  const directCrossesRoute = existingRoutes.some((existing) => {
    const sharedNodeId = existing.nodeIds.find(
      (nodeId) => nodeId === link.sourceNodeId || nodeId === link.targetNodeId
    );
    return existing.points
      .slice(1)
      .some((point, index) => {
        const endpointIndex = index + 1;
        const touchesSharedNode =
          sharedNodeId &&
          ((existing.nodeIds[0] === sharedNodeId && endpointIndex === 1) ||
            (existing.nodeIds[1] === sharedNodeId && endpointIndex === existing.points.length - 1));
        return !touchesSharedNode && segmentsCross(ports.source, ports.target, existing.points[index], point);
      });
  });
  if (directIsClear && !directCrossesRoute) return directRoute;

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
      for (const existing of existingRoutes) {
        const sharedNodeId = existing.nodeIds.find(
          (nodeId) => nodeId === link.sourceNodeId || nodeId === link.targetNodeId
        );
        for (let index = 1; index < existing.points.length; index += 1) {
          const touchesSharedNode =
            sharedNodeId &&
            ((existing.nodeIds[0] === sharedNodeId && index === 1) ||
              (existing.nodeIds[1] === sharedNodeId && index === existing.points.length - 1));
          if (touchesSharedNode) continue;
          if (segmentsCross(currentPoint, nextPoint, existing.points[index - 1], existing.points[index])) crossingPenalty += 180;
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

const routedLayoutQuality = (links, nodeLayouts, linkLayouts, direction) => {
  let crossings = 0;
  let bends = 0;
  let length = 0;
  let straightRoutes = 0;
  let directionExceptions = 0;
  const routes = links.map((link) => {
    const route = linkLayouts[link.id]?.route || [];
    bends += Math.max(0, route.length - 2);
    if (route.length === 2) straightRoutes += 1;
    for (let index = 1; index < route.length; index += 1) {
      length += Math.hypot(route[index].x - route[index - 1].x, route[index].y - route[index - 1].y);
    }
    const source = nodeLayouts[link.sourceNodeId];
    const target = nodeLayouts[link.targetNodeId];
    if (source && target) {
      const sourceCenter = centerOf(source);
      const targetCenter = centerOf(target);
      const preferred = directionVector(direction);
      if ((targetCenter.x - sourceCenter.x) * preferred.x + (targetCenter.y - sourceCenter.y) * preferred.y <= 0.0001) {
        directionExceptions += 1;
      }
    }
    return { link, route };
  });
  for (let index = 0; index < routes.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < routes.length; otherIndex += 1) {
      const left = routes[index];
      const right = routes[otherIndex];
      const sharedNodeId = [left.link.sourceNodeId, left.link.targetNodeId].find(
        (id) => id === right.link.sourceNodeId || id === right.link.targetNodeId
      );
      let pairCrosses = false;
      for (let leftIndex = 1; leftIndex < left.route.length && !pairCrosses; leftIndex += 1) {
        for (let rightIndex = 1; rightIndex < right.route.length; rightIndex += 1) {
          const leftTouchesShared =
            sharedNodeId &&
            ((left.link.sourceNodeId === sharedNodeId && leftIndex === 1) ||
              (left.link.targetNodeId === sharedNodeId && leftIndex === left.route.length - 1));
          const rightTouchesShared =
            sharedNodeId &&
            ((right.link.sourceNodeId === sharedNodeId && rightIndex === 1) ||
              (right.link.targetNodeId === sharedNodeId && rightIndex === right.route.length - 1));
          if (leftTouchesShared && rightTouchesShared) continue;
          if (segmentsCross(left.route[leftIndex - 1], left.route[leftIndex], right.route[rightIndex - 1], right.route[rightIndex])) {
            pairCrosses = true;
            break;
          }
        }
      }
      if (pairCrosses) crossings += 1;
    }
  }
  return {
    crossings,
    bends,
    straightRoutes,
    directionExceptions,
    length: Math.round(length)
  };
};

const runComposedLayout = async (workspace, options = {}) => {
  const nextWorkspace = structuredClone(workspace);
  const activeDocumentId = initialDocumentId(nextWorkspace, options.treeId);
  const activeTree = nextWorkspace.trees.find((tree) => tree.id === activeDocumentId);
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
  const diagramDefinition = getDiagramDefinition(activeTree.type);
  const direction = activeTree.layout?.direction || diagramDefinition?.defaultDirection || "TB";
  const spacingNodeNode = activeTree.layout?.settings?.spacingNodeNode || ITEM_SPACING;
  const spacingLayer = activeTree.layout?.settings?.spacingLayer || LAYER_SPACING;
  const layoutEngine = options.layoutEngine || createElkLayeredEngine();

  const layoutContainer = async (frameId, isRoot = false) => {
    const frame = frameById.get(frameId);
    const previousFrame = canvas.layout?.frames?.[frameId] || {};
    const restoreExpandedLayout = !frame.collapsed && Boolean(previousFrame.restoreExpandedLayout);
    if (!isRoot && (frame.collapsed || restoreExpandedLayout)) {
      const originX = previousFrame.x || 0;
      const originY = previousFrame.y || 0;
      const nodeLayouts = {};
      const frameLayouts = {};
      const collectPreservedSubtree = (subtreeFrameId) => {
        const subtreeFrame = frameById.get(subtreeFrameId);
        for (const nodeId of subtreeFrame?.nodeIds || []) {
          const previous = previousNodeBox(nodeOwners, nodeId);
          if (previous) nodeLayouts[nodeId] = { ...previous, x: previous.x - originX, y: previous.y - originY };
        }
        for (const childFrameId of subtreeFrame?.childFrameIds || []) {
          const previous = canvas.layout?.frames?.[childFrameId];
          if (previous) frameLayouts[childFrameId] = { ...previous, x: previous.x - originX, y: previous.y - originY };
          collectPreservedSubtree(childFrameId);
        }
      };
      collectPreservedSubtree(frameId);
      const preservedContentBoxes = [
        ...Object.values(nodeLayouts),
        ...Object.entries(frameLayouts)
          .filter(([preservedFrameId]) => preservedFrameId !== frameId)
          .map(([, box]) => box)
      ];
      const fittedExpandedWidth = Math.max(
        previousFrame.expandedWidth || previousFrame.width || MIN_FRAME_WIDTH,
        ...preservedContentBoxes.map((box) => box.x + box.width + FRAME_SIDE_PADDING)
      );
      const fittedExpandedHeight = Math.max(
        previousFrame.expandedHeight || previousFrame.height || MIN_FRAME_HEIGHT,
        ...preservedContentBoxes.map((box) => box.y + box.height + FRAME_BOTTOM_PADDING)
      );
      const width = frame.collapsed
        ? COLLAPSED_FRAME_WIDTH
        : fittedExpandedWidth;
      const height = frame.collapsed
        ? COLLAPSED_FRAME_HEIGHT
        : fittedExpandedHeight;
      const { restoreExpandedLayout: _restoreExpandedLayout, ...stablePreviousFrame } = previousFrame;
      frameLayouts[frameId] = {
        ...stablePreviousFrame,
        x: 0,
        y: 0,
        width,
        height,
        expandedWidth: fittedExpandedWidth,
        expandedHeight: fittedExpandedHeight,
        layoutSource: previousFrame.pinned ? "manual" : "auto"
      };
      return {
        width,
        height,
        nodeLayouts,
        frameLayouts,
        optimization: {}
      };
    }
    const childResults = new Map();
    const optimization = {};
    for (const childFrameId of frame.childFrameIds || []) {
      const childResult = await layoutContainer(childFrameId, false);
      childResults.set(childFrameId, childResult);
      Object.assign(optimization, childResult.optimization);
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
    const previousParent = isRoot ? null : canvas.layout?.frames?.[frameId];
    const currentChildren = items
      .map((item) => {
        const previous = item.type === "frame"
          ? canvas.layout?.frames?.[item.id]
          : previousNodeBox(nodeOwners, item.id);
        if (!previous) return null;
        return {
          id: item.id,
          x: previous.x - (previousParent?.x || 0),
          y: previous.y - (previousParent?.y || 0),
          width: item.width,
          height: item.height
        };
      })
      .filter(Boolean);
    let elkChildren = [];
    let graphEdges = [];
    let preserveCurrentLayout = false;
    if (items.length) {
      graphEdges = collapsedEdges(frameId, links, nodeOwners, frameById);
      const cycleBreak = breakCyclesForLayout(items.map((item) => item.id), graphEdges);
      const goalTreeRanks = diagramDefinition?.layering === "distanceToSink"
        ? longestSinkRanks(items.map((item) => item.id), cycleBreak.edges)
        : new Map();
      const maximumGoalTreeRank = goalTreeRanks.size ? Math.max(...goalTreeRanks.values()) : 0;
      const rankPartitions = goalTreeRanks.size === items.length
        ? new Map(
            [...goalTreeRanks.entries()].map(([itemId, rank]) => [
              itemId,
              maximumGoalTreeRank - rank
            ])
          )
        : new Map();
      const optimize = !isRoot && items.length >= 3 && graphEdges.length >= 2 && !items.some((item) => item.pinned);
      const canCompareCurrent =
        !isRoot &&
        graphEdges.length > 0 &&
        currentChildren.length === items.length &&
        !collectionHasOverlaps(currentChildren) &&
        !items.some((item) => item.pinned);
      const selectedLayout = await selectLayoutCandidate(
        layoutEngine,
        {
          containerId: frameId,
          items,
          edges: cycleBreak.edges,
          direction,
          spacingNodeNode,
          spacingLayer,
          rankPartitions,
          optimize
        },
        items,
        graphEdges,
        direction,
        canCompareCurrent ? currentChildren : null,
        cycleBreak.reversed
      );
      elkChildren = selectedLayout.laidOut.children || [];
      preserveCurrentLayout = Boolean(selectedLayout.config?.preserved);
      if (optimize || cycleBreak.reversed) {
        optimization[frameId] = {
          strategy: "weighted-stable-layered",
          minimumImprovement: MINIMUM_LAYOUT_IMPROVEMENT,
          candidates: selectedLayout.candidates,
          cycleBreakingStrategy: diagramDefinition?.cycleBreaking?.strategy || "greedyFeedbackArc",
          cycleBreaks: cycleBreak.reversed,
          cycleBreakEdgeIds: cycleBreak.reversedEdgeIds,
          ...selectedLayout.config,
          ...selectedLayout.quality
        };
      }
    }

    const elkPositions = new Map(elkChildren.map((child) => [child.id, child]));
    for (const item of items) {
      const laidOut = elkPositions.get(item.id) || { x: 0, y: 0 };
      item.x = Math.round((laidOut.x || 0) + (preserveCurrentLayout ? 0 : sidePadding));
      item.y = Math.round((laidOut.y || 0) + (preserveCurrentLayout ? 0 : topPadding));
    }
    if (preserveCurrentLayout && items.length) {
      const offsetX = Math.max(0, sidePadding - Math.min(...items.map((item) => item.x)));
      const offsetY = Math.max(0, topPadding - Math.min(...items.map((item) => item.y)));
      for (const item of items) {
        item.x += offsetX;
        item.y += offsetY;
      }
    }
    if (!isRoot && frame.kind === "container" && graphEdges.length === 0) {
      compactDisconnectedItems(items, sidePadding, topPadding, spacingNodeNode);
    }
    for (const item of items) {
      if (!item.pinned) continue;

      const previous = item.type === "frame" ? canvas.layout?.frames?.[item.id] : previousNodeBox(nodeOwners, item.id);
      if (!previous) continue;
      item.x = Math.max(isRoot ? 24 : sidePadding, Math.round(previous.x - (previousParent?.x || 0)));
      item.y = Math.max(isRoot ? 24 : topPadding, Math.round(previous.y - (previousParent?.y || 0)));
    }
    if (!preserveCurrentLayout) resolveItemCollisions(items, direction);

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
    const width = isRoot
      ? contentRight + sidePadding
      : Math.max(MIN_FRAME_WIDTH, contentRight + FRAME_SIDE_PADDING);
    const height = isRoot
      ? contentBottom + bottomPadding
      : Math.max(MIN_FRAME_HEIGHT, contentBottom + FRAME_BOTTOM_PADDING);

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

    return { width, height, nodeLayouts, frameLayouts, optimization };
  };

  const result = await layoutContainer(canvas.rootFrameId, true);
  canvas.layout = { ...(canvas.layout || {}), frames: result.frameLayouts };
  canvas.updatedAt = new Date().toISOString();

  const visibleEndpointId = (nodeId) => {
    const owner = nodeOwners.get(nodeId);
    return collapsedAncestorFrameId(owner?.node.frameId, frameById) || nodeId;
  };
  const endpointLayouts = {
    ...Object.fromEntries(
      [...nodeOwners.entries()]
        .filter(([, owner]) => !collapsedAncestorFrameId(owner.node.frameId, frameById))
        .map(([nodeId]) => [nodeId, result.nodeLayouts[nodeId]])
        .filter(([, box]) => Boolean(box))
    ),
    ...Object.fromEntries(
      canvas.frames
        .filter(
          (frame) =>
            frame.collapsed &&
            frame.id !== canvas.rootFrameId &&
            !collapsedAncestorFrameId(frame.parentFrameId, frameById)
        )
        .map((frame) => [frame.id, result.frameLayouts[frame.id]])
        .filter(([, box]) => Boolean(box))
    )
  };
  const routedRoutes = [];
  const allEndpointBoxes = Object.entries(endpointLayouts);
  for (const tree of trees) {
    const nextNodeLayout = {};
    for (const node of tree.nodes || []) {
      if (result.nodeLayouts[node.id]) nextNodeLayout[node.id] = result.nodeLayouts[node.id];
    }
    const nextLinkLayout = {};
    const projectedLinks = (tree.links || []).map((link) => ({
      ...link,
      sourceNodeId: visibleEndpointId(link.sourceNodeId),
      targetNodeId: visibleEndpointId(link.targetNodeId)
    }));
    const visibleProjectedLinks = projectedLinks.filter((link) => link.sourceNodeId !== link.targetNodeId);
    const portAssignments = distributedPortAssignments(visibleProjectedLinks, endpointLayouts, direction);
    for (const link of tree.links || []) {
      const sourceEndpointId = visibleEndpointId(link.sourceNodeId);
      const targetEndpointId = visibleEndpointId(link.targetNodeId);
      const projectedLink = { ...link, sourceNodeId: sourceEndpointId, targetNodeId: targetEndpointId };
      const hidden = sourceEndpointId === targetEndpointId;
      const source = endpointLayouts[sourceEndpointId];
      const target = endpointLayouts[targetEndpointId];
      const previous = tree.layout?.links?.[link.id] || {};
      const obstacles = allEndpointBoxes
        .filter(([itemId]) => itemId !== sourceEndpointId && itemId !== targetEndpointId)
        .map(([, box]) => box);
      const route = !hidden && source && target
        ? orthogonalRoute(source, target, obstacles, routedRoutes, direction, projectedLink, portAssignments.get(link.id))
        : [];
      if (route.length) {
        routedRoutes.push({ points: route, nodeIds: [sourceEndpointId, targetEndpointId] });
      }
      nextLinkLayout[link.id] = {
        ...previous,
        route,
        hidden,
        projectedSourceId: sourceEndpointId,
        projectedTargetId: targetEndpointId,
        routeSource: "auto",
        labelPosition:
          route.length
            ? routeMidpoint(route)
            : previous.labelPosition || { x: 0, y: 0 }
      };
    }
    const quality = routedLayoutQuality(visibleProjectedLinks, endpointLayouts, nextLinkLayout, direction);
    quality.cycleBreaks = Object.values(result.optimization || {}).reduce(
      (sum, entry) => sum + (entry.cycleBreaks || 0),
      0
    );
    tree.layout = {
      ...(tree.layout || {}),
      engine: `${layoutEngine.id}-composed`,
      direction,
      lastRunAt: new Date().toISOString(),
      optimization: result.optimization,
      quality,
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
  const frameById = new Map(canvas.frames.map((frame) => [frame.id, frame]));
  const nodes = trees.flatMap((tree) =>
    tree.nodes.map((node) => ({
      node,
      box: tree.layout?.nodes?.[node.id],
      hidden: Boolean(collapsedAncestorFrameId(node.frameId, frameById))
    }))
  );
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

  for (const { node, box, hidden } of nodes) {
    if (!box) {
      issues.push({ code: "NODE_LAYOUT_MISSING", nodeId: node.id });
      continue;
    }
    if (hidden) continue;
    const ownerFrame = frameById.get(node.frameId);
    if (ownerFrame && ownerFrame.id !== canvas.rootFrameId) {
      const frameBox = canvas.layout?.frames?.[ownerFrame.id];
      if (!frameBox || !boxContains(frameBox, box)) {
        issues.push({ code: "NODE_OUTSIDE_FRAME", nodeId: node.id, frameId: ownerFrame.id });
      }
    }
    for (const frame of finiteFrames) {
      if (collapsedAncestorFrameId(frame.parentFrameId, frameById)) continue;
      if (isFrameAncestor(frame.id, node.frameId)) continue;
      const frameBox = canvas.layout?.frames?.[frame.id];
      if (frameBox && boxesOverlap(box, frameBox)) {
        issues.push({ code: "NODE_OVERLAPS_UNRELATED_FRAME", nodeId: node.id, frameId: frame.id });
      }
    }
  }

  const visibleBoxesById = new Map(
    nodes.filter(({ hidden }) => !hidden).map(({ node, box }) => [node.id, box])
  );
  for (const frame of finiteFrames) {
    if (frame.collapsed && !collapsedAncestorFrameId(frame.parentFrameId, frameById)) {
      visibleBoxesById.set(frame.id, canvas.layout?.frames?.[frame.id]);
    }
  }
  for (const tree of trees) {
    for (const link of tree.links || []) {
      const linkLayout = tree.layout?.links?.[link.id] || {};
      if (linkLayout.hidden) continue;
      const route = linkLayout.route || [];
      if (route.length < 2) {
        issues.push({ code: "LINK_ROUTE_MISSING", linkId: link.id });
        continue;
      }
      for (const [itemId, box] of visibleBoxesById) {
        if (!box || itemId === linkLayout.projectedSourceId || itemId === linkLayout.projectedTargetId) continue;
        for (let index = 1; index < route.length; index += 1) {
          if (!segmentIntersectsBox(route[index - 1], route[index], box)) continue;
          issues.push({ code: "LINK_CROSSES_NODE", linkId: link.id, nodeId: itemId });
          break;
        }
      }
    }
  }

  const visibleNodes = nodes.filter(({ hidden }) => !hidden);
  for (let index = 0; index < visibleNodes.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < visibleNodes.length; otherIndex += 1) {
      if (visibleNodes[index].box && visibleNodes[otherIndex].box && boxesOverlap(visibleNodes[index].box, visibleNodes[otherIndex].box)) {
        issues.push({ code: "NODE_OVERLAP", nodeIds: [visibleNodes[index].node.id, visibleNodes[otherIndex].node.id] });
      }
    }
  }

  for (const frame of finiteFrames) {
    if (collapsedAncestorFrameId(frame.parentFrameId, frameById)) continue;
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

  const visibleFrames = finiteFrames.filter((frame) => !collapsedAncestorFrameId(frame.parentFrameId, frameById));
  for (let index = 0; index < visibleFrames.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < visibleFrames.length; otherIndex += 1) {
      const left = visibleFrames[index];
      const right = visibleFrames[otherIndex];
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
