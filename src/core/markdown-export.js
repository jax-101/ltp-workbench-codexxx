const relationVerbalization = (relation, elementById) => {
  const inputs = relation.inputs.map((endpoint) => elementById.get(endpoint.elementId)?.statement || endpoint.elementId);
  const outputs = relation.outputs.map((endpoint) => elementById.get(endpoint.elementId)?.statement || endpoint.elementId);
  if (relation.type === "CONFLICT" && inputs.length === 2) {
    return `${inputs[1]} conflicts with ${inputs[0]}.`;
  }
  const combination = relation.combination === "SIMPLE" ? "" : ` ${relation.combination}`;
  return `If ${inputs.join(combination || ", ")}, then ${outputs.join(" and ")}.`;
};

const nativeSemanticMarkdown = (tree, system) => {
  const graph = tree.semanticKernel;
  const elementById = new Map(graph.elements.map((element) => [element.id, element]));
  const assumptionsByRelation = new Map();
  for (const assumption of graph.assumptions || []) {
    const relationId = assumption.subject?.relationId;
    const entries = assumptionsByRelation.get(relationId) || [];
    entries.push(assumption);
    assumptionsByRelation.set(relationId, entries);
  }
  const groups = new Map();
  for (const element of graph.elements) {
    const entries = groups.get(element.type) || [];
    entries.push(element);
    groups.set(element.type, entries);
  }
  const lines = [
    `# ${tree.name}`,
    "",
    `System: ${system.name}`,
    `Diagram: ${graph.diagramType || graph.profile}`,
    `Logic: ${graph.logicMode}`,
    "",
    "## Elements",
    ""
  ];
  for (const [type, elements] of groups) {
    lines.push(`### ${type}`, "");
    for (const element of elements) lines.push(`- **${element.id}**: ${element.statement}`);
    lines.push("");
  }
  lines.push("## Relations", "");
  for (const relation of graph.relations) {
    lines.push(`### ${relation.id} [${relation.combination ?? relation.type}]`, "");
    lines.push(relation.verbalization || relationVerbalization(relation, elementById), "");
    const assumptions = assumptionsByRelation.get(relation.id) || [];
    if (assumptions.length) {
      lines.push("Assumptions:");
      for (const assumption of assumptions) {
        const scope = assumption.subject?.kind === "RELATION"
          ? ""
          : ` (${assumption.subject?.kind}: ${assumption.subject?.elementId || "conflict"})`;
        lines.push(`- [${assumption.status || "DRAFT"}] ${assumption.statement}${scope}`);
      }
      lines.push("");
    }
  }
  if (graph.derivations?.length) {
    lines.push("## Derivations", "");
    for (const derivation of graph.derivations) {
      const source = elementById.get(derivation.sourceElementId);
      lines.push(
        `- **${derivation.id}** [${derivation.type}]: ${source?.statement || derivation.sourceElementId} -> ${derivation.targetAssumptionId} (${derivation.status})`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
};

const goalTreeMarkdown = (tree, system) => {
  const nodeById = Object.fromEntries(tree.nodes.map((node) => [node.id, node]));
  const assumptionsByLink = (tree.assumptions || []).reduce((acc, assumption) => {
    acc[assumption.linkId] = acc[assumption.linkId] || [];
    acc[assumption.linkId].push(assumption);
    return acc;
  }, {});
  const goal = tree.nodes.find((node) => node.type === "goal");
  const linksTo = (targetId) => tree.links.filter((link) => link.targetNodeId === targetId);
  const lines = [
    `# ${tree.name}`,
    "",
    `System: ${system.name}`,
    "",
    "## System Profile",
    "",
    `- Owner: ${system.profile.owner?.name || "Unknown"}`,
    `- Purpose: ${system.profile.purpose || ""}`,
    `- Boundary: ${system.profile.boundary?.summary || ""}`,
    "",
    "## Goal",
    "",
    `- ${goal?.statement || "No goal defined"}`,
    "",
    "## Critical Success Factors",
    ""
  ];
  for (const csfLink of linksTo(goal?.id)) {
    const csf = nodeById[csfLink.sourceNodeId];
    if (!csf) continue;
    lines.push(`### ${csf.shortLabel || csf.statement}`, "", csf.statement, "", `Link: ${csfLink.verbalization}`, "");
    const assumptions = assumptionsByLink[csfLink.id] || [];
    if (assumptions.length) {
      lines.push("Assumptions:");
      for (const assumption of assumptions) lines.push(`- ${assumption.statement}`);
      lines.push("");
    }
    const ncLinks = linksTo(csf.id);
    if (ncLinks.length) {
      lines.push("Necessary Conditions:");
      for (const ncLink of ncLinks) {
        const nc = nodeById[ncLink.sourceNodeId];
        if (nc) lines.push(`- ${nc.statement}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
};

const buildMarkdownExport = (tree, system) =>
  tree.semanticKernel?.storageMode === "NATIVE"
    ? nativeSemanticMarkdown(tree, system)
    : goalTreeMarkdown(tree, system);

module.exports = { buildMarkdownExport, goalTreeMarkdown, nativeSemanticMarkdown };
