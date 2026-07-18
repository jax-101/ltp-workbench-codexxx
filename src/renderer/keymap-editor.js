(function exposeKeymapEditor(root, factory) {
  root.LTP_KEYMAP_EDITOR = factory(root.LTP_KEYMAP);
})(globalThis, (engine) => {
  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const modifierKeys = new Set(["Meta", "Control", "Alt", "Shift"]);
  const scopeLabels = { global: "Global", workspace: "Workspace", canvas: "Canvas", assumptions: "Assumptions" };

  const create = ({ bridge, commandConfig, catalog, labels, onApplied }) => {
    let opened = false;
    let draft = commandConfig.currentKeymap();
    let issues = [];
    let query = "";
    let capture = null;
    let persistedState = { status: "loaded", path: "", issues: [] };

    const validation = () => engine.validateKeymap(draft, catalog);
    const visibleCommands = () => Object.keys(catalog).filter((command) =>
      !query || `${labels[command]} ${command}`.toLowerCase().includes(query.toLowerCase()));

    const bindingHtml = (command, binding, index) => `
      <div class="keymap-binding" data-keymap-binding="${command}:${index}">
        <button data-keymap-capture="${command}:${index}" aria-label="Change ${escapeHtml(labels[command])}">
          <kbd>${escapeHtml(engine.formatBinding(binding))}</kbd>
        </button>
        <select data-keymap-scope="${command}:${index}" aria-label="Scope for ${escapeHtml(labels[command])}">
          ${Object.entries(scopeLabels).map(([scope, label]) =>
            `<option value="${scope}" ${binding.scope === scope ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <button class="icon-action" data-keymap-remove="${command}:${index}" aria-label="Remove ${escapeHtml(engine.formatBinding(binding))}">x</button>
      </div>`;

    const issueHtml = () => issues.length ? `
      <div class="keymap-issues" role="alert">
        ${issues.map((item) => `<p><strong>${escapeHtml(item.code)}</strong> ${escapeHtml(item.message)}</p>`).join("")}
      </div>` : "";

    const render = () => {
      document.querySelector(".keymap-editor-backdrop")?.remove();
      if (!opened) return;
      const backdrop = document.createElement("div");
      backdrop.className = "keymap-editor-backdrop";
      backdrop.innerHTML = `
        <section class="keymap-editor" role="dialog" aria-modal="true" aria-labelledby="keymap-title">
          <header class="keymap-editor-header">
            <div><span>Keyboard</span><h2 id="keymap-title">Shortcuts</h2></div>
            <button class="icon-action" data-keymap-close aria-label="Close keyboard settings">x</button>
          </header>
          <div class="keymap-toolbar">
            <input data-keymap-search value="${escapeHtml(query)}" placeholder="Search commands" aria-label="Search commands" />
            <button data-keymap-reveal>Open file</button>
          </div>
          ${capture ? `<div class="keymap-capture" role="status">Press shortcut for <strong>${escapeHtml(labels[capture.command])}</strong></div>` : ""}
          ${issueHtml()}
          <div class="keymap-list">
            ${visibleCommands().map((command) => `
              <div class="keymap-row" data-keymap-command="${command}">
                <span>${escapeHtml(labels[command])}</span>
                <div class="keymap-bindings">
                  ${(draft.bindings[command] || []).map((binding, index) => bindingHtml(command, binding, index)).join("")}
                  <button class="icon-action" data-keymap-add="${command}" aria-label="Add shortcut for ${escapeHtml(labels[command])}">+</button>
                </div>
              </div>`).join("")}
          </div>
          <footer class="keymap-editor-footer">
            <span class="keymap-file" title="${escapeHtml(persistedState.path)}">${escapeHtml(draft.id)}</span>
            <button data-keymap-reset>Defaults</button>
            <button data-keymap-close>Cancel</button>
            <button class="primary-action" data-keymap-save>Save</button>
          </footer>
        </section>`;
      document.body.appendChild(backdrop);
      requestAnimationFrame(() => (capture
        ? backdrop.querySelector(".keymap-capture")
        : backdrop.querySelector("[data-keymap-search]"))?.focus?.());
    };

    const applyPersisted = (result) => {
      persistedState = result;
      if (result.ok) commandConfig.applyKeymap(result.keymap);
      draft = commandConfig.currentKeymap();
      issues = result.issues || [];
      onApplied(result);
    };

    const open = () => {
      opened = true;
      query = "";
      capture = null;
      draft = commandConfig.currentKeymap();
      issues = persistedState.issues || [];
      render();
    };

    const close = () => {
      opened = false;
      capture = null;
      issues = [];
      render();
    };

    const parseTarget = (value) => {
      const [command, rawIndex] = value.split(":");
      return { command, index: Number(rawIndex) };
    };

    const save = async () => {
      const checked = validation();
      issues = checked.issues;
      if (!checked.ok) return render();
      const result = await bridge.saveKeymap(checked.keymap);
      applyPersisted(result);
      if (result.ok) close();
      else render();
    };

    const handleClick = async (event) => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.matches("[data-keymap-open]")) return open();
      if (!opened || !target.closest(".keymap-editor")) return;
      event.preventDefault();
      if (target.matches("[data-keymap-close]")) return close();
      if (target.matches("[data-keymap-save]")) return save();
      if (target.matches("[data-keymap-reset]")) {
        applyPersisted(await bridge.resetKeymap());
        return render();
      }
      if (target.matches("[data-keymap-reveal]")) return bridge.revealKeymap();
      if (target.dataset.keymapAdd) capture = { command: target.dataset.keymapAdd, index: draft.bindings[target.dataset.keymapAdd].length };
      if (target.dataset.keymapCapture) capture = parseTarget(target.dataset.keymapCapture);
      if (target.dataset.keymapRemove) {
        const { command, index } = parseTarget(target.dataset.keymapRemove);
        draft.bindings[command].splice(index, 1);
        issues = validation().issues;
      }
      render();
    };

    const handleInput = (event) => {
      if (event.target.matches("[data-keymap-search]")) {
        query = event.target.value;
        return render();
      }
      if (event.target.matches("[data-keymap-scope]")) {
        const { command, index } = parseTarget(event.target.dataset.keymapScope);
        draft.bindings[command][index].scope = event.target.value;
        issues = validation().issues;
        render();
      }
    };

    const handleKeydown = (event) => {
      if (!opened || !event.target.closest?.(".keymap-editor")) return;
      event.stopImmediatePropagation();
      if (!capture) {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
        return;
      }
      event.preventDefault();
      if (event.key === "Escape") {
        capture = null;
        return render();
      }
      if (modifierKeys.has(event.key)) return;
      const current = draft.bindings[capture.command][capture.index];
      const binding = engine.bindingFromEvent(event, current?.scope || "workspace");
      if (capture.index === draft.bindings[capture.command].length) draft.bindings[capture.command].push(binding);
      else draft.bindings[capture.command][capture.index] = binding;
      if (draft.id === "ltp.default") draft.id = "ltp.user";
      capture = null;
      issues = validation().issues;
      render();
    };

    document.addEventListener("click", (event) => { handleClick(event).catch(console.error); });
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleInput);
    document.addEventListener("keydown", handleKeydown, true);

    const shortcutListHtml = (labelFor) => Object.entries(commandConfig.currentKeymap().bindings)
      .map(([command, bindings]) => `<div class="shortcut-item" data-shortcut-command="${command}">
        <span class="shortcut-keys">${bindings.map((binding) => `<kbd>${escapeHtml(engine.formatBinding(binding))}</kbd>`).join("")}</span>
        <span>${escapeHtml(labelFor(command))}</span></div>`).join("");

    const runDomAcceptance = async () => {
      open();
      document.querySelector('[data-keymap-capture="showHints:0"]').click();
      document.querySelector(".keymap-editor").dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true }));
      const captured = draft.id === "ltp.user" && draft.bindings.showHints[0].key === "j";
      const saved = await bridge.saveKeymap(draft);
      applyPersisted(saved);
      const customResolves = commandConfig.commandForEvent(new KeyboardEvent("keydown", { key: "j" })) === "showHints";
      applyPersisted(await bridge.resetKeymap());
      open();
      draft.bindings.createNode = engine.clone(draft.bindings.showHints);
      issues = validation().issues;
      render();
      return { ok: captured && saved.ok && customResolves && issues.some((item) => item.code === "SHORTCUT_COLLISION") && Boolean(document.querySelector(".keymap-issues")), issues };
    };

    return { close, open, runDomAcceptance, setState: (state) => { persistedState = state; }, shortcutListHtml };
  };

  return { create };
});
