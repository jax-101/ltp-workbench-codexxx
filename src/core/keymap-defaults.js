(function exposeKeymapDefaults(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_KEYMAP_DEFAULTS = api;
})(globalThis, () => {
  const workspace = (key, options = {}) => ({ key, scope: "workspace", ...options });
  const bindings = {
    commandPalette: [workspace("k", { primary: true })],
    editKeymap: [workspace(",", { primary: true })],
    openAssumptionWorkbench: [workspace("a", { primary: true, shift: true })],
    showHints: [workspace("h")],
    toggleMultiSelect: [workspace("m")],
    moveSelectionToParent: [workspace("p", { command: true })],
    chooseSelectionFrame: [workspace("f", { command: true })],
    createNode: [workspace("n")],
    createParentNode: [workspace("a", { shift: true })],
    createSupportingNode: [workspace("a", { shift: false })],
    focusInspector: [workspace("Enter")],
    beginConnection: [workspace("l")],
    createFrame: [workspace("f")],
    selectParentFrame: [workspace("[")],
    enterSelectedFrame: [workspace("]")],
    focusSearch: [workspace("/")],
    togglePin: [workspace("p")],
    toggleFrameCollapsed: [workspace("x", { primary: true }), workspace("-")],
    previewNode: [workspace(" ")],
    cancelContext: [workspace("g", { control: true })],
    undo: [workspace("z", { primary: true, shift: false })],
    redo: [workspace("z", { primary: true, shift: true }), workspace("y", { primary: true })],
    copySelection: [workspace("c", { primary: true })],
    pasteSelection: [workspace("v", { primary: true })],
    deleteSelection: [workspace("Delete"), workspace("Backspace"), workspace("d", { control: true })],
    cycleNodeTypes: [workspace("Tab", { shift: true })],
    panUp: [workspace("ArrowUp"), workspace("p", { control: true })],
    panDown: [workspace("ArrowDown"), workspace("n", { control: true })],
    panLeft: [workspace("ArrowLeft"), workspace("b", { control: true })],
    panRight: [workspace("ArrowRight"), workspace("f", { control: true })],
    centerSelection: [workspace("c")],
    zoomIn: [workspace("=", { primary: true }), workspace("+", { primary: true })],
    zoomOut: [workspace("-", { primary: true })],
    resetZoom: [workspace("0", { primary: true })],
    fitView: [workspace("1", { primary: true })],
    toggleLeftPanel: [workspace("[", { alt: true })],
    toggleRightPanel: [workspace("]", { alt: true })],
    runAutoLayout: [workspace("l", { primary: true, shift: true })]
  };

  const labels = {
    commandPalette: "Command palette",
    editKeymap: "Edit keyboard shortcuts",
    openAssumptionWorkbench: "Open Assumption Workbench",
    showHints: "Toggle hints",
    toggleMultiSelect: "Start multiple selection",
    moveSelectionToParent: "Move selection to parent frame",
    chooseSelectionFrame: "Move selection to a frame",
    createNode: "Create node",
    createParentNode: "Create parent condition",
    createSupportingNode: "Create supporting condition",
    focusInspector: "Edit selected element",
    beginConnection: "Create link",
    createFrame: "Create frame",
    selectParentFrame: "Leave frame focus or select parent frame",
    enterSelectedFrame: "Focus selected frame",
    focusSearch: "Search",
    togglePin: "Toggle pin",
    toggleFrameCollapsed: "Minimize or expand selected frame",
    previewNode: "View full statement",
    cancelContext: "Cancel or clear selection",
    undo: "Undo last change",
    redo: "Redo last change",
    copySelection: "Copy selected subgraph",
    pasteSelection: "Paste copied subgraph",
    deleteSelection: "Delete selection",
    cycleNodeTypes: "Cycle selected entity types",
    panUp: "Move view up",
    panDown: "Move view down",
    panLeft: "Move view left",
    panRight: "Move view right",
    centerSelection: "Center selection",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetZoom: "Reset zoom",
    fitView: "Fit diagram",
    toggleLeftPanel: "Toggle left panel",
    toggleRightPanel: "Toggle right panel",
    runAutoLayout: "Run automatic layout"
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const DEFAULT_KEYMAP = Object.freeze({ schemaVersion: 1, id: "ltp.default", bindings: clone(bindings) });
  const COMMAND_CATALOG = Object.freeze(Object.fromEntries(
    Object.keys(bindings).map((command) => [command, Object.freeze({ label: labels[command] })])
  ));
  return { COMMAND_CATALOG, DEFAULT_KEYMAP };
});
