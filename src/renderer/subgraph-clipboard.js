(function exposeSubgraphClipboard(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_SUBGRAPH_CLIPBOARD = api;
})(globalThis, () => {
  const clone = (value) => structuredClone(value);
  const deepFreeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  };

  const capture = (tree, selectedIds) => {
    const kernel = tree?.semanticKernel;
    const selected = new Set(selectedIds || []);
    const elements = clone((kernel?.elements || []).filter((item) => selected.has(item.id)));
    const elementIds = new Set(elements.map((item) => item.id));
    const relationClosed = (relation) =>
      [...(relation.inputs || []), ...(relation.outputs || [])].every((endpoint) => elementIds.has(endpoint.elementId));
    const relations = clone((kernel?.relations || []).filter(relationClosed));
    const relationIds = new Set(relations.map((item) => item.id));
    const assumptions = clone((kernel?.assumptions || []).filter((item) => relationIds.has(item.subject?.relationId)));
    const assumptionIds = new Set(assumptions.map((item) => item.id));
    const derivationClosed = (item) =>
      (!item.sourceElementId || elementIds.has(item.sourceElementId))
      && (!item.targetElementId || elementIds.has(item.targetElementId))
      && (!item.targetAssumptionId || assumptionIds.has(item.targetAssumptionId));
    const derivations = clone((kernel?.derivations || []).filter(derivationClosed));
    const sourceBoxes = elements.map((item) => tree.layout?.nodes?.[item.id]).filter(Boolean);
    const minX = sourceBoxes.length ? Math.min(...sourceBoxes.map((box) => box.x)) : 0;
    const minY = sourceBoxes.length ? Math.min(...sourceBoxes.map((box) => box.y)) : 0;
    const layout = Object.fromEntries(elements.map((item) => {
      const box = tree.layout?.nodes?.[item.id] || {};
      return [item.id, {
        x: Number.isFinite(box.x) ? box.x - minX : 0,
        y: Number.isFinite(box.y) ? box.y - minY : 0,
        width: Number.isFinite(box.width) ? box.width : 250,
        height: Number.isFinite(box.height) ? box.height : 72
      }];
    }));
    return deepFreeze({
      contractVersion: "subgraph.clipboard.v1",
      diagramType: kernel?.diagramType || kernel?.profile || tree?.type,
      elements,
      relations,
      assumptions,
      derivations,
      layout
    });
  };

  const createIdMap = (clipboard, idFactory) => Object.fromEntries(
    ["elements", "relations", "assumptions", "derivations"].map((key) => [
      key,
      Object.fromEntries(clipboard[key].map((item) => [item.id, idFactory(key.slice(0, -1))]))
    ])
  );

  const createController = (ports) => {
    let clipboard = null;
    let pasteCount = 0;
    const copySelection = () => {
      clipboard = capture(ports.getTree(), ports.getSelectionIds());
      pasteCount = 0;
      if (!clipboard.elements.length) {
        clipboard = null;
        ports.setStatus("Select one or more entities before copying");
        return false;
      }
      ports.setStatus(
        `Copied ${clipboard.elements.length} entities, ${clipboard.relations.length} complete relations and ${clipboard.assumptions.length} assumptions`
      );
      return true;
    };
    const pasteSelection = async () => {
      if (!clipboard) {
        ports.setStatus("Nothing to paste");
        return false;
      }
      pasteCount += 1;
      const idMap = createIdMap(clipboard, ports.idFactory);
      const base = ports.getOrigin();
      const origin = { x: base.x + pasteCount * 16, y: base.y + pasteCount * 16 };
      await ports.execute({
        treeId: ports.getTree().id,
        targetFrameId: ports.getTargetFrameId(),
        clipboard,
        idMap,
        origin
      });
      const pastedIds = Object.values(idMap.elements);
      ports.selectElements(pastedIds);
      ports.setStatus(`Pasted ${pastedIds.length} entities as one reversible change`);
      return true;
    };
    return { copySelection, pasteSelection, inspect: () => clipboard };
  };

  return { capture, createController, createIdMap };
});
