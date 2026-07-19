(function exposeFrameFocusView(root, factory) {
  const engine = typeof module !== "undefined" && module.exports
    ? require("../core/frame-focus")
    : root.LTP_FRAME_FOCUS;
  const api = factory(engine);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_FRAME_FOCUS_VIEW = api;
})(globalThis, (engine) => {
  const create = (options) => {
    let session = engine.emptySession();
    let visibleFrames = null;

    const refresh = () => {
      const frameId = engine.currentFrameId(session);
      visibleFrames = frameId ? engine.visibleFrameIds(options.getFrames(), frameId) : null;
      options.onChanged?.({ frameId, path: engine.focusPath(session), visibleFrames });
    };

    const enter = (frameId) => {
      const result = engine.enter(session, frameId, options.captureView(), options.getFrames(), {
        rootFrameId: options.getRootFrameId()
      });
      if (!result.ok) return result;
      session = result.session;
      refresh();
      options.activateView(frameId);
      return { ...result, path: engine.focusPath(session), visibleFrames };
    };

    const exit = () => {
      const result = engine.exit(session);
      if (!result.ok) return result;
      session = result.session;
      refresh();
      options.restoreView(result.restoreView);
      return { ...result, path: engine.focusPath(session), visibleFrames };
    };

    const reset = () => {
      session = engine.emptySession();
      refresh();
    };

    const exitTo = (frameId = null) => {
      const path = engine.focusPath(session);
      if (frameId !== null && !path.includes(frameId)) {
        return {
          ok: false,
          error: { code: "VIEW_FOCUS_PATH_INVALID", message: `Frame ${frameId} is not in the focus path`, frameId },
          path,
          visibleFrames
        };
      }
      if (engine.currentFrameId(session) === frameId) {
        return { ok: true, unchanged: true, frameId, path, visibleFrames };
      }
      let result = null;
      while (engine.currentFrameId(session) !== frameId && session.stack.length) result = exit();
      return result;
    };

    return {
      containsFrame: (frameId) => !visibleFrames || visibleFrames.has(frameId),
      containsNode: (node) => !visibleFrames || visibleFrames.has(node?.frameId),
      currentFrameId: () => engine.currentFrameId(session),
      enter,
      exit,
      exitTo,
      path: () => engine.focusPath(session),
      reset
    };
  };

  return { create };
});
