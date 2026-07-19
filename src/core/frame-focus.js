(function exposeFrameFocus(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_FRAME_FOCUS = api;
})(globalThis, () => {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const emptySession = () => ({ schemaVersion: 1, stack: [] });
  const currentFrameId = (session) => session?.stack?.at(-1)?.frameId || null;
  const frameMap = (frames) => new Map(frames.map((frame) => [frame.id, frame]));

  const isDescendant = (frames, frameId, ancestorId, includeSelf = true) => {
    const byId = frameMap(frames);
    let current = byId.get(frameId);
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      if ((includeSelf || current.id !== frameId) && current.id === ancestorId) return true;
      seen.add(current.id);
      current = byId.get(current.parentFrameId);
    }
    return false;
  };

  const validateTarget = (session, frameId, frames, options = {}) => {
    const frame = frameMap(frames).get(frameId);
    if (!frame || frameId === options.rootFrameId) {
      return { code: "VIEW_FOCUS_INVALID", message: `Frame ${frameId} cannot be focused`, frameId };
    }
    const current = currentFrameId(session);
    if (current && !isDescendant(frames, frameId, current, false)) {
      return { code: "VIEW_FOCUS_OUTSIDE", message: `Frame ${frameId} is outside focused frame ${current}`, frameId, currentFrameId: current };
    }
    return null;
  };

  const enter = (session, frameId, viewSnapshot, frames, options = {}) => {
    const error = validateTarget(session, frameId, frames, options);
    if (error) return { ok: false, error, session: clone(session || emptySession()) };
    const next = clone(session || emptySession());
    next.stack.push({ frameId, returnView: clone(viewSnapshot) });
    return { ok: true, session: next, frameId };
  };

  const exit = (session) => {
    const next = clone(session || emptySession());
    const level = next.stack.pop();
    if (!level) return { ok: false, error: { code: "VIEW_FOCUS_INACTIVE", message: "No frame focus is active" }, session: next };
    return { ok: true, session: next, restoreView: clone(level.returnView), frameId: currentFrameId(next) };
  };

  const visibleFrameIds = (frames, focusFrameId) => {
    if (!focusFrameId) return new Set(frames.map((frame) => frame.id));
    return new Set(frames.filter((frame) => isDescendant(frames, frame.id, focusFrameId)).map((frame) => frame.id));
  };

  const visibleNodeIds = (nodes, visibleFrames) =>
    new Set(nodes.filter((node) => visibleFrames.has(node.frameId)).map((node) => node.id));

  const focusPath = (session) => (session?.stack || []).map((level) => level.frameId);

  return { currentFrameId, emptySession, enter, exit, focusPath, isDescendant, validateTarget, visibleFrameIds, visibleNodeIds };
});
