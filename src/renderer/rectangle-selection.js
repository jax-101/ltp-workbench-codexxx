(function exposeRectangleSelection(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_RECTANGLE_SELECTION = api;
})(globalThis, () => {
  const normalizeRectangle = (start, end) => ({
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y)
  });

  const containsRectangle = (outer, inner, tolerance = 1) =>
    inner.left >= outer.left - tolerance
    && inner.top >= outer.top - tolerance
    && inner.right <= outer.right + tolerance
    && inner.bottom <= outer.bottom + tolerance;

  const normalizeSelectionIds = (ids, candidates) => {
    const selectedIds = new Set(ids);
    const selectedFrameIds = new Set(candidates
      .filter((item) => item.type === "frame" && selectedIds.has(item.id))
      .map((item) => item.id));
    const parentByFrameId = new Map(candidates
      .filter((item) => item.type === "frame")
      .map((item) => [item.id, item.parentFrameId || null]));
    const hasSelectedAncestor = (frameId) => {
      const seen = new Set();
      let current = frameId;
      while (current && !seen.has(current)) {
        if (selectedFrameIds.has(current)) return true;
        seen.add(current);
        current = parentByFrameId.get(current) || null;
      }
      return false;
    };
    return candidates
      .filter((item) => selectedIds.has(item.id))
      .filter((item) => item.type === "frame"
        ? !hasSelectedAncestor(item.parentFrameId)
        : !hasSelectedAncestor(item.frameId))
      .map((item) => item.id);
  };

  const normalizeRoots = (candidates) => normalizeSelectionIds(candidates.map((item) => item.id), candidates);

  const selectContained = (selection, candidates) => normalizeSelectionIds(
    candidates.filter((item) => containsRectangle(selection, item.rectangle)).map((item) => item.id),
    candidates
  );

  const domCandidates = (canvas) => [...canvas.querySelectorAll(".tree-frame, .tree-node")]
    .filter((element) => {
      const style = getComputedStyle(element);
      const rectangle = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rectangle.width > 0 && rectangle.height > 0;
    })
    .map((element) => ({
      id: element.dataset.elementId,
      type: element.dataset.elementType,
      frameId: element.dataset.frameId || null,
      parentFrameId: element.dataset.parentFrameId || null,
      rectangle: element.getBoundingClientRect()
    }));

  const createOverlay = () => {
    const overlay = document.createElement("div");
    overlay.className = "rectangle-selection";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    return overlay;
  };

  const renderOverlay = (overlay, rectangle) => {
    overlay.style.left = `${rectangle.left}px`;
    overlay.style.top = `${rectangle.top}px`;
    overlay.style.width = `${rectangle.right - rectangle.left}px`;
    overlay.style.height = `${rectangle.bottom - rectangle.top}px`;
  };

  const bind = (canvas) => {
    if (!canvas || canvas.dataset.rectangleSelectionBound === "true") return () => {};
    canvas.dataset.rectangleSelectionBound = "true";
    const begin = (event) => {
      if (event.button !== 0 || event.target.closest(".tree-node, .link-target, .hint-badge, input, textarea, select")) return;
      const start = { x: event.clientX, y: event.clientY };
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const origin = event.target;
      let overlay = null;
      let dragging = false;
      const move = (moveEvent) => {
        if (!dragging && Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) < 6) return;
        if (!dragging) {
          dragging = true;
          overlay = createOverlay();
          document.documentElement.classList.add("rectangle-selecting");
        }
        moveEvent.preventDefault();
        renderOverlay(overlay, normalizeRectangle(start, { x: moveEvent.clientX, y: moveEvent.clientY }));
      };
      const finish = (finishEvent) => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", cancel);
        document.documentElement.classList.remove("rectangle-selecting");
        overlay?.remove();
        if (!dragging || finishEvent.type === "pointercancel") return;
        const rectangle = normalizeRectangle(start, { x: finishEvent.clientX, y: finishEvent.clientY });
        const candidates = domCandidates(canvas);
        const ids = selectContained(rectangle, candidates);
        canvas.dispatchEvent(new CustomEvent("ltp:rectangle-selection", { detail: { ids, additive, candidates } }));
        if (origin.closest?.(".tree-frame")) {
          origin.dataset.rectangleDragged = "true";
          origin.addEventListener("click", (clickEvent) => {
            if (origin.dataset.rectangleDragged !== "true") return;
            delete origin.dataset.rectangleDragged;
            clickEvent.preventDefault();
            clickEvent.stopImmediatePropagation();
          }, { capture: true, once: true });
        }
      };
      const cancel = (cancelEvent) => finish(cancelEvent);
      document.addEventListener("pointermove", move, { passive: false });
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", cancel);
    };
    canvas.addEventListener("pointerdown", begin);
    return () => canvas.removeEventListener("pointerdown", begin);
  };

  const dispatchDrag = (origin, start, end, modifiers = {}) => {
    origin.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: start.x, clientY: start.y, bubbles: true, ...modifiers }));
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: end.x, clientY: end.y, bubbles: true, cancelable: true, ...modifiers }));
    document.dispatchEvent(new PointerEvent("pointerup", { clientX: end.x, clientY: end.y, bubbles: true, ...modifiers }));
  };

  const runDomAcceptance = (canvas = document.querySelector(".canvas")) => {
    const nodes = [...canvas.querySelectorAll(".tree-node")];
    const pair = nodes.find((left, index) => nodes.slice(index + 1)
      .some((right) => right.dataset.frameId === left.dataset.frameId));
    const peers = nodes.filter((node) => node.dataset.frameId === pair?.dataset.frameId).slice(0, 2);
    if (peers.length !== 2) return { ok: false, expected: [], selected: [] };
    const boxes = peers.map((node) => node.getBoundingClientRect());
    const start = { x: Math.min(...boxes.map((box) => box.left)) - 3, y: Math.min(...boxes.map((box) => box.top)) - 3 };
    const end = { x: Math.max(...boxes.map((box) => box.right)) + 3, y: Math.max(...boxes.map((box) => box.bottom)) + 3 };
    const expected = selectContained(normalizeRectangle(start, end), domCandidates(canvas));
    const origin = canvas.querySelector(`.tree-frame[data-element-id="${pair.dataset.frameId}"]`) || canvas;
    dispatchDrag(origin, start, end);
    const selected = [...document.querySelectorAll(".tree-frame.selected, .tree-node.selected")]
      .map((element) => element.dataset.elementId);
    return {
      ok: origin.dataset.elementType === "frame"
        && expected.length >= 2
        && expected.every((id) => selected.includes(id))
        && selected.every((id) => expected.includes(id)),
      expected,
      selected
    };
  };

  return { bind, containsRectangle, normalizeRectangle, normalizeRoots, normalizeSelectionIds, runDomAcceptance, selectContained };
});
