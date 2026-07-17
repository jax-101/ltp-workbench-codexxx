const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const resolveRolePresentation = ({ items, nodeById, presentation }) => {
  if (!presentation?.columns?.length || !presentation.parallelBranches?.length) return null;
  const idByRole = new Map();
  for (const item of items) {
    const role = nodeById.get(item.id)?.semanticRole;
    if (role) idByRole.set(role, item.id);
  }
  const requiredRoles = new Set(presentation.columns.flat());
  if ([...requiredRoles].some((role) => !idByRole.has(role))) return null;
  const columns = presentation.columns.map((roles) => roles.map((role) => idByRole.get(role)));
  const branches = presentation.parallelBranches.map((roles) => roles.map((role) => idByRole.get(role)));
  const sharedIds = branches.reduce(
    (shared, branch) => shared.filter((id) => branch.includes(id)),
    [...branches[0]]
  );
  return { columns, branches, sharedIds };
};

const resolveBranchPresentation = ({ items, nodeById, presentation }) => {
  if (!presentation?.columnTypes?.length || !presentation.branchPathTypes?.length) return null;
  const branchField = presentation.branchField || "semanticBranchId";
  const orderField = presentation.branchOrderField || "semanticBranchOrder";
  const entries = items.map((item) => ({ item, node: nodeById.get(item.id) })).filter((entry) => entry.node);
  const shared = entries.find((entry) => entry.node.semanticRole === presentation.sharedRole);
  if (!shared) return null;

  const branchIds = [...new Set(entries.map((entry) => entry.node[branchField]).filter(Boolean))]
    .map((branchId) => {
      const branchEntries = entries.filter((entry) => entry.node[branchField] === branchId);
      const orders = branchEntries.map((entry) => entry.node[orderField]).filter(Number.isFinite);
      return { branchId, order: orders.length ? Math.min(...orders) : Number.MAX_SAFE_INTEGER };
    })
    .sort((left, right) => left.order - right.order || left.branchId.localeCompare(right.branchId));
  if (branchIds.length < 2) return null;

  const branches = branchIds.map(({ branchId }) => presentation.branchPathTypes.map((type) => {
    if (type === shared.node.semanticType) return shared.item.id;
    return entries.find((entry) => entry.node[branchField] === branchId && entry.node.semanticType === type)?.item.id;
  }));
  if (branches.some((branch) => branch.some((id) => !id))) return null;
  const columns = presentation.columnTypes.map((type) => {
    if (type === shared.node.semanticType) return [shared.item.id];
    return branchIds.map(({ branchId }) => entries.find(
      (entry) => entry.node[branchField] === branchId && entry.node.semanticType === type
    )?.item.id).filter(Boolean);
  });
  if (columns.some((column) => column.length === 0)) return null;
  return { columns, branches, sharedIds: [shared.item.id] };
};

const resolvePresentation = (context) => resolveBranchPresentation(context) || resolveRolePresentation(context);

const compilePresentationConstraints = ({ items, nodeById, definition, direction, spacing }) => {
  const presentation = definition?.canonicalPresentation;
  const resolved = resolvePresentation({ items, nodeById, presentation });
  if (!resolved) return null;
  const { columns, branches, sharedIds } = resolved;
  const constrainedIds = new Set(columns.flat());
  const sharedIdSet = new Set(sharedIds);
  const lanes = branches.map((branch) => branch.filter((id) => !sharedIdSet.has(id)));

  const lastColumn = columns.length - 1;
  const rankPartitions = new Map();
  columns.forEach((ids, columnIndex) => {
    for (const id of ids) rankPartitions.set(id, lastColumn - columnIndex);
  });
  for (const item of items) {
    if (!rankPartitions.has(item.id)) rankPartitions.set(item.id, lastColumn);
  }

  const horizontal = direction === "LR" || direction === "RL";
  const apply = (children) => {
    const next = children.map((child) => ({ ...child }));
    const byId = new Map(next.map((child) => [child.id, child]));
    const constrainedBoxes = [...constrainedIds].map((id) => byId.get(id)).filter(Boolean);
    if (constrainedBoxes.length !== constrainedIds.size) return next;

    const crossStart = Math.min(...constrainedBoxes.map((box) => horizontal ? box.y : box.x));
    const laneExtent = Math.max(...constrainedBoxes.map((box) => horizontal ? box.height : box.width));
    const laneStep = laneExtent + spacing;
    const laneCenters = lanes.map((_, index) => crossStart + laneExtent / 2 + index * laneStep);
    lanes.forEach((lane, laneIndex) => {
      for (const id of lane) {
        const box = byId.get(id);
        if (!box) continue;
        if (horizontal) box.y = laneCenters[laneIndex] - box.height / 2;
        else box.x = laneCenters[laneIndex] - box.width / 2;
      }
    });

    const middle = laneCenters.reduce((sum, value) => sum + value, 0) / laneCenters.length;
    for (const id of sharedIds) {
      const box = byId.get(id);
      if (horizontal) box.y = middle - box.height / 2;
      else box.x = middle - box.width / 2;
    }

    const constrainedCrossEnd = Math.max(...constrainedBoxes.map((box) =>
      horizontal ? box.y + box.height : box.x + box.width
    ));
    let extraOffset = constrainedCrossEnd + spacing;
    for (const box of next.filter((child) => !constrainedIds.has(child.id)).sort((left, right) => left.id.localeCompare(right.id))) {
      if (horizontal) {
        box.y = extraOffset;
        extraOffset += box.height + spacing;
      } else {
        box.x = extraOffset;
        extraOffset += box.width + spacing;
      }
    }
    return next;
  };

  const isSatisfied = (children, tolerance = 8) => {
    const byId = new Map(children.map((child) => [child.id, child]));
    if ([...constrainedIds].some((id) => !byId.has(id))) return false;
    const center = (id) => centerOf(byId.get(id));
    const cross = (point) => horizontal ? point.y : point.x;
    const primary = (point) => horizontal ? point.x : point.y;
    const laneCenters = lanes.map((lane) => lane.map((id) => center(id)));
    if (laneCenters.some((centers) => Math.max(...centers.map(cross)) - Math.min(...centers.map(cross)) > tolerance)) return false;
    const lanePositions = laneCenters.map((centers) => cross(centers[0]));
    for (let index = 0; index < lanePositions.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < lanePositions.length; otherIndex += 1) {
        if (Math.abs(lanePositions[index] - lanePositions[otherIndex]) < tolerance * 2) return false;
      }
    }

    const canonicalBranch = branches[0];
    const sourcePrimary = primary(center(canonicalBranch[0]));
    const middlePrimary = primary(center(canonicalBranch[Math.floor(canonicalBranch.length / 2)]));
    const targetPrimary = primary(center(canonicalBranch.at(-1)));
    return direction === "RL" || direction === "BT"
      ? sourcePrimary > middlePrimary + tolerance && middlePrimary > targetPrimary + tolerance
      : sourcePrimary < middlePrimary - tolerance && middlePrimary < targetPrimary - tolerance;
  };

  return { rankPartitions, apply, isSatisfied };
};

module.exports = { compilePresentationConstraints };
