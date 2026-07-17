const { randomUUID } = require("node:crypto");
const { LtpError } = require("./errors");

const listDocuments = (workspace) =>
  (workspace.trees || []).map((tree) => ({
    id: tree.id,
    systemId: tree.systemId,
    canvasId: tree.canvasId,
    type: tree.type,
    name: tree.name,
    status: tree.status
  }));

const resolveDocument = (workspace, documentId) => {
  const document = (workspace.trees || []).find((tree) => tree.id === documentId);
  if (!document) {
    throw new LtpError("DOCUMENT_NOT_FOUND", `Document ${documentId} was not found`, { documentId });
  }
  return document;
};

const initialDocumentId = (workspace, preferredId = null) => {
  const candidates = [preferredId, workspace.workspace?.activeTreeId].filter(Boolean);
  for (const candidate of candidates) {
    if ((workspace.trees || []).some((tree) => tree.id === candidate)) return candidate;
  }
  return (workspace.trees || []).find(() => true)?.id || null;
};

const createView = (workspace, options = {}) => {
  const documentId = options.documentId || initialDocumentId(workspace);
  const document = resolveDocument(workspace, documentId);
  const canvas = (workspace.canvases || []).find((candidate) => candidate.id === document.canvasId);
  if (!canvas) throw new LtpError("CANVAS_NOT_FOUND", `Canvas ${document.canvasId} was not found`, { canvasId: document.canvasId });
  const focusFrameId = options.focusFrameId || null;
  if (focusFrameId) {
    const frame = canvas.frames.find((candidate) => candidate.id === focusFrameId);
    if (!frame || (frame.treeId && frame.treeId !== document.id)) {
      throw new LtpError("VIEW_FOCUS_INVALID", `Frame ${focusFrameId} cannot be focused by document ${document.id}`, {
        documentId: document.id,
        focusFrameId
      });
    }
  }
  const persisted = canvas.viewState || {};
  return {
    id: options.id || `view-${randomUUID()}`,
    documentId: document.id,
    canvasId: canvas.id,
    focusFrameId,
    zoom: options.zoom ?? persisted.zoom ?? 1,
    pan: structuredClone(options.pan || persisted.pan || { x: 0, y: 0 }),
    selectedElementId: options.selectedElementId ?? persisted.selectedElementId ?? null,
    panels: structuredClone(options.panels || persisted.panels || { leftOpen: true, rightOpen: true })
  };
};

const duplicateView = (workspace, view, options = {}) =>
  createView(workspace, {
    ...structuredClone(view),
    ...options,
    id: options.id || `view-${randomUUID()}`,
    documentId: options.documentId || view.documentId
  });

module.exports = { createView, duplicateView, initialDocumentId, listDocuments, resolveDocument };
