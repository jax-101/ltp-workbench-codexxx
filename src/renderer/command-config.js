(function configureCommands() {
const keymapEngine = window.LTP_KEYMAP;
const { COMMAND_CATALOG, DEFAULT_KEYMAP } = window.LTP_KEYMAP_DEFAULTS;
const commandBindings = keymapEngine.clone(DEFAULT_KEYMAP.bindings);
let currentKeymap = keymapEngine.clone(DEFAULT_KEYMAP);
let scopeProvider = () => "canvas";

window.LTP_COMMAND_BINDINGS = commandBindings;
window.LTP_COMMAND_LABELS = Object.freeze(Object.fromEntries(
  Object.entries(COMMAND_CATALOG).map(([command, entry]) => [command, entry.label])
));

const applyKeymap = (candidate) => {
  const validation = keymapEngine.validateKeymap(candidate, COMMAND_CATALOG);
  if (!validation.ok) return validation;
  for (const command of Object.keys(commandBindings)) delete commandBindings[command];
  Object.assign(commandBindings, keymapEngine.clone(validation.keymap.bindings));
  currentKeymap = keymapEngine.clone(validation.keymap);
  return { ok: true, issues: [], keymap: keymapEngine.clone(currentKeymap) };
};

const resolveConfiguredCommand = (event, bindings = commandBindings, scope = scopeProvider()) =>
  keymapEngine.resolveCommand(event, bindings, scope);

const commandEntries = (query = "", labelFor = (command) => window.LTP_COMMAND_LABELS[command]) =>
  Object.entries(commandBindings)
    .map(([command, bindings]) => ({ command, label: labelFor(command), shortcuts: bindings.map(keymapEngine.formatBinding) }))
    .filter((entry) => !query || `${entry.label} ${entry.shortcuts.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));

const resolveContextualLabel = (command, labels, context = {}) => {
  if (!context.assumptionContext) return labels[command] || command;
  const assumptionLabels = {
    openAssumptionWorkbench: context.workbenchOpen ? "Close Assumption Workbench" : "Open Assumption Workbench",
    showHints: "Toggle assumption hints",
    toggleMultiSelect: "Select multiple assumptions",
    createNode: "Create assumption",
    focusInspector: "Edit active assumption",
    deleteSelection: "Delete selected assumptions",
    cycleNodeTypes: "Cycle selected assumption statuses",
    panUp: "Previous assumption",
    panDown: "Next assumption",
    panLeft: "Previous logical line",
    panRight: "Next logical line",
    focusSearch: context.workbenchOpen ? "Search Assumption Workbench" : "Search",
    cancelContext: context.workbenchOpen ? "Close Assumption Workbench" : "Close assumption context"
  };
  return assumptionLabels[command] || labels[command] || command;
};

window.LTP_COMMAND_CONFIG = Object.freeze({
  applyKeymap,
  commandEntries,
  commandForEvent: resolveConfiguredCommand,
  contextualCommandLabel: resolveContextualLabel,
  currentKeymap: () => keymapEngine.clone(currentKeymap),
  formatShortcutBinding: keymapEngine.formatBinding,
  setScopeProvider: (provider) => { scopeProvider = provider; }
});
})();
