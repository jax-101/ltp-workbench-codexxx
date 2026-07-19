(function exposeFrameFocusBreadcrumbs(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_FRAME_FOCUS_BREADCRUMBS = api;
})(globalThis, () => {
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  const ancestorIds = (frames, frameId) => {
    const byId = new Map(frames.map((frame) => [frame.id, frame]));
    const result = [];
    const seen = new Set();
    let frame = byId.get(frameId);
    while (frame && !seen.has(frame.id)) {
      result.unshift(frame.id);
      seen.add(frame.id);
      frame = byId.get(frame.parentFrameId);
    }
    return result;
  };

  const trail = ({ frames = [], focusPath = [], activeFrameId = null, systemName, documentName }) => {
    const byId = new Map(frames.map((frame) => [frame.id, frame]));
    const frameIds = focusPath.length ? focusPath : ancestorIds(frames, activeFrameId);
    const baseLabels = [systemName, documentName].filter(Boolean);
    return baseLabels.map((label, index) => ({
      id: index === baseLabels.length - 1 && focusPath.length ? "" : null,
      label,
      interactive: index === baseLabels.length - 1 && Boolean(focusPath.length),
      current: false
    })).concat(frameIds.map((id, index) => ({
      id,
      label: byId.get(id)?.name || id,
      interactive: Boolean(focusPath.length && index < frameIds.length - 1),
      current: Boolean(focusPath.length && index === frameIds.length - 1)
    })));
  };

  const render = (options) => {
    const items = trail(options);
    if (!options.focusPath?.length) {
      return `<p class="diagram-breadcrumb">${items.map((item) => escapeHtml(item.label)).join(" / ")}</p>`;
    }
    return `<nav class="frame-focus-breadcrumbs" aria-label="Frame focus path">${items.map((item, index) => {
      const separator = index ? '<span class="breadcrumb-separator" aria-hidden="true">/</span>' : "";
      if (item.interactive) {
        return `${separator}<button type="button" data-frame-focus-target="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`;
      }
      return `${separator}<span ${item.current ? 'aria-current="page"' : ""}>${escapeHtml(item.label)}</span>`;
    }).join("")}</nav>`;
  };

  return { ancestorIds, render, trail };
});
