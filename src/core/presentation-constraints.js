const centerOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const compilePresentationConstraints = ({ items, nodeById, definition, direction, spacing }) => {
  const presentation = definition?.canonicalPresentation;
  if (!presentation?.columns?.length || !presentation.parallelBranches?.length) return null;

  const idByRole = new Map();
  for (const item of items) {
    const role = nodeById.get(item.id)?.semanticRole;
    if (role) idByRole.set(role, item.id);
  }
  const requiredRoles = new Set(presentation.columns.flat());
  if ([...requiredRoles].some((role) => !idByRole.has(role))) return null;

  const lastColumn = presentation.columns.length - 1;
  const rankPartitions = new Map();
  presentation.columns.forEach((roles, columnIndex) => {
    for (const role of roles) rankPartitions.set(idByRole.get(role), lastColumn - columnIndex);
  });
  for (const item of items) {
    if (!rankPartitions.has(item.id)) rankPartitions.set(item.id, lastColumn);
  }

  const horizontal = direction === "LR" || direction === "RL";
  const sharedRoles = presentation.parallelBranches.reduce(
    (shared, branch) => shared.filter((role) => branch.includes(role)),
    [...presentation.parallelBranches[0]]
  );
  const laneRoles = presentation.parallelBranches.map((branch) => branch.filter((role) => !sharedRoles.includes(role)));
  const constrainedIds = new Set([...requiredRoles].map((role) => idByRole.get(role)));

  const apply = (children) => {
    const next = children.map((child) => ({ ...child }));
    const byId = new Map(next.map((child) => [child.id, child]));
    const roleBoxes = [...constrainedIds].map((id) => byId.get(id)).filter(Boolean);
    if (roleBoxes.length !== constrainedIds.size) return next;

    const crossStart = Math.min(...roleBoxes.map((box) => horizontal ? box.y : box.x));
    const laneExtent = Math.max(...roleBoxes.map((box) => horizontal ? box.height : box.width));
    const laneStep = laneExtent + spacing;
    const laneCenters = laneRoles.map((_, index) => crossStart + laneExtent / 2 + index * laneStep);

    laneRoles.forEach((roles, laneIndex) => {
      for (const role of roles) {
        const box = byId.get(idByRole.get(role));
        if (!box) continue;
        if (horizontal) box.y = laneCenters[laneIndex] - box.height / 2;
        else box.x = laneCenters[laneIndex] - box.width / 2;
      }
    });

    const middle = laneCenters.reduce((sum, value) => sum + value, 0) / laneCenters.length;
    for (const role of sharedRoles) {
      const sharedBox = byId.get(idByRole.get(role));
      if (horizontal) sharedBox.y = middle - sharedBox.height / 2;
      else sharedBox.x = middle - sharedBox.width / 2;
    }

    const constrainedCrossEnd = Math.max(...roleBoxes.map((box) =>
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
    const centerForRole = (role) => centerOf(byId.get(idByRole.get(role)));
    if ([...requiredRoles].some((role) => !byId.has(idByRole.get(role)))) return false;
    const cross = (point) => horizontal ? point.y : point.x;
    const primary = (point) => horizontal ? point.x : point.y;
    const branchCenters = laneRoles.map((branch) => branch.map(centerForRole));
    if (branchCenters.some((centers) => Math.max(...centers.map(cross)) - Math.min(...centers.map(cross)) > tolerance)) {
      return false;
    }
    const lanePositions = branchCenters.map((centers) => cross(centers[0]));
    for (let index = 0; index < lanePositions.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < lanePositions.length; otherIndex += 1) {
        if (Math.abs(lanePositions[index] - lanePositions[otherIndex]) < tolerance * 2) return false;
      }
    }

    const canonicalBranch = presentation.parallelBranches[0];
    const sourceRole = canonicalBranch[0];
    const middleRole = canonicalBranch[Math.floor(canonicalBranch.length / 2)];
    const targetRole = canonicalBranch.at(-1);
    const sourcePrimary = primary(centerForRole(sourceRole));
    const middlePrimary = primary(centerForRole(middleRole));
    const targetPrimary = primary(centerForRole(targetRole));
    return direction === "RL" || direction === "BT"
      ? sourcePrimary > middlePrimary + tolerance && middlePrimary > targetPrimary + tolerance
      : sourcePrimary < middlePrimary - tolerance && middlePrimary < targetPrimary - tolerance;
  };

  return { rankPartitions, apply, isSatisfied };
};

module.exports = { compilePresentationConstraints };
