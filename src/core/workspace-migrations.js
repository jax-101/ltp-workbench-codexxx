const clone = (value) => structuredClone(value);
const { addSemanticKernel } = require("./semantic-migration");

const migrateLegacyWorkspace = (source) => {
  const workspace = clone(source);
  if (Array.isArray(workspace.canvases) && workspace.trees?.every((tree) => tree.canvasId && tree.hostFrameId)) {
    return { workspace, changed: false };
  }

  const trees = Array.isArray(workspace.trees) ? workspace.trees : [];
  const treesBySystem = new Map();
  for (const tree of trees) {
    const systemId = tree.systemId || workspace.workspace?.activeSystemId || "system";
    const group = treesBySystem.get(systemId) || [];
    group.push(tree);
    treesBySystem.set(systemId, group);
  }

  workspace.schemaVersion = "0.2";
  workspace.canvases = [];

  for (const [systemId, systemTrees] of treesBySystem) {
    const canvasId = `canvas-${systemId}`;
    const rootFrameId = `frame-canvas-root-${systemId}`;
    const frames = [];
    const frameLayout = {};
    const hostFrameIds = [];

    for (const tree of systemTrees) {
      const legacyFrames = Array.isArray(tree.frames) ? tree.frames : [];
      const hostFrameId = tree.rootFrameId || legacyFrames.find((frame) => !frame.parentFrameId)?.id;
      if (hostFrameId) hostFrameIds.push(hostFrameId);

      for (const legacyFrame of legacyFrames) {
        const isHost = legacyFrame.id === hostFrameId;
        frames.push({
          ...legacyFrame,
          canvasId,
          treeId: legacyFrame.treeId || tree.id,
          kind: isHost ? "diagram" : legacyFrame.kind || "container",
          parentFrameId: isHost ? rootFrameId : legacyFrame.parentFrameId
        });
      }
      Object.assign(frameLayout, tree.layout?.frames || {});

      tree.schemaVersion = "0.2";
      tree.canvasId = canvasId;
      tree.hostFrameId = hostFrameId;
      tree.layout = { ...(tree.layout || {}) };
      delete tree.layout.frames;
      delete tree.rootFrameId;
      delete tree.frames;
      delete tree.viewState;
    }

    const firstViewState = systemTrees.map((tree) => source.trees?.find((item) => item.id === tree.id)?.viewState).find(Boolean);
    workspace.canvases.push({
      schemaVersion: "0.2",
      id: canvasId,
      systemId,
      name: `${workspace.systems?.find((system) => system.id === systemId)?.name || "System"} canvas`,
      rootFrameId,
      frames: [
        {
          id: rootFrameId,
          canvasId,
          treeId: null,
          kind: "root",
          parentFrameId: null,
          name: "Root",
          semanticType: "workspaceRoot",
          collapsed: false,
          childFrameIds: hostFrameIds,
          nodeIds: [],
          notes: "Infinite workspace root"
        },
        ...frames
      ],
      layout: { frames: frameLayout },
      viewState: clone(firstViewState || {
        activeFrameId: hostFrameIds[0] || rootFrameId,
        selectedElementId: null,
        selectionRootIds: [],
        mode: "navigation",
        zoom: 1,
        pan: { x: 0, y: 0 },
        panels: { leftOpen: true, rightOpen: true }
      }),
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    });
  }

  return { workspace, changed: true };
};

const migrateWorkspace = (workspace, options = {}) => {
  const legacyMigration = migrateLegacyWorkspace(workspace);
  if (options.semanticKernel === false) {
    return {
      ...legacyMigration,
      legacyChanged: legacyMigration.changed,
      semanticChanged: false,
      migratedTreeIds: []
    };
  }

  const semanticMigration = addSemanticKernel(legacyMigration.workspace);
  return {
    workspace: semanticMigration.workspace,
    changed: legacyMigration.changed || semanticMigration.changed,
    legacyChanged: legacyMigration.changed,
    semanticChanged: semanticMigration.changed,
    migratedTreeIds: semanticMigration.migratedTreeIds
  };
};

module.exports = { migrateWorkspace };
