(function exposeKeymap(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_KEYMAP = api;
})(globalThis, () => {
  const SCOPES = new Set(["global", "workspace", "canvas", "assumptions"]);
  const MODIFIERS = ["primary", "command", "control", "alt", "shift"];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const issue = (code, path, message, detail = {}) => ({ code, path, message, ...detail });

  const normalizeBinding = (binding) => ({
    key: binding.key,
    scope: binding.scope || "workspace",
    primary: Boolean(binding.primary),
    command: Boolean(binding.command),
    control: Boolean(binding.control),
    alt: Boolean(binding.alt),
    shift: Boolean(binding.shift)
  });

  const physicalSignatures = (binding) => {
    const suffix = `${binding.alt ? "A" : "_"}${binding.shift ? "S" : "_"}:${binding.key.toLowerCase()}`;
    if (binding.command) return [`mac:M_:${suffix}`];
    if (binding.primary) return [`mac:M_:${suffix}`, `other:_C:${suffix}`];
    if (binding.control) return [`mac:_C:${suffix}`, `other:_C:${suffix}`];
    return [`mac:__:${suffix}`, `other:__:${suffix}`];
  };

  const scopesOverlap = (left, right) => {
    if (left === "global" || right === "global") return true;
    if (left === "workspace" || right === "workspace") return true;
    return left === right;
  };

  const validateBinding = (binding, path) => {
    const issues = [];
    if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
      return [issue("KEYMAP_BINDING_INVALID", path, "Binding must be an object")];
    }
    if (typeof binding.key !== "string" || !binding.key.length || binding.key.length > 24) {
      issues.push(issue("KEYMAP_KEY_INVALID", `${path}.key`, "Key must be a non-empty string of at most 24 characters"));
    }
    if (!SCOPES.has(binding.scope || "workspace")) {
      issues.push(issue("KEYMAP_SCOPE_INVALID", `${path}.scope`, "Scope is not supported"));
    }
    const principalCount = [binding.primary, binding.command, binding.control].filter(Boolean).length;
    if (principalCount > 1) {
      issues.push(issue("KEYMAP_MODIFIERS_INVALID", path, "Primary, command and control are mutually exclusive"));
    }
    for (const modifier of MODIFIERS) {
      if (binding[modifier] !== undefined && typeof binding[modifier] !== "boolean") {
        issues.push(issue("KEYMAP_MODIFIER_INVALID", `${path}.${modifier}`, `${modifier} must be boolean`));
      }
    }
    return issues;
  };

  const validateKeymap = (artifact, catalog) => {
    const issues = [];
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      return { ok: false, issues: [issue("KEYMAP_INVALID", "$", "Keymap must be an object")], keymap: null };
    }
    if (artifact.schemaVersion !== 1) issues.push(issue("KEYMAP_VERSION_UNSUPPORTED", "$.schemaVersion", "Only keymap schema version 1 is supported"));
    if (typeof artifact.id !== "string" || !artifact.id.trim()) issues.push(issue("KEYMAP_ID_INVALID", "$.id", "Keymap id is required"));
    if (!artifact.bindings || typeof artifact.bindings !== "object" || Array.isArray(artifact.bindings)) {
      issues.push(issue("KEYMAP_BINDINGS_INVALID", "$.bindings", "Bindings must be an object"));
      return { ok: false, issues, keymap: null };
    }
    const commands = Object.keys(catalog);
    for (const command of Object.keys(artifact.bindings)) {
      if (!catalog[command]) issues.push(issue("KEYMAP_COMMAND_UNKNOWN", `$.bindings.${command}`, `Unknown command: ${command}`));
    }
    const normalized = { schemaVersion: 1, id: artifact.id, bindings: {} };
    for (const command of commands) {
      const bindings = artifact.bindings[command];
      if (!Array.isArray(bindings)) {
        issues.push(issue("KEYMAP_COMMAND_MISSING", `$.bindings.${command}`, `Bindings array is required for ${command}`));
        continue;
      }
      bindings.forEach((binding, index) => issues.push(...validateBinding(binding, `$.bindings.${command}[${index}]`)));
      normalized.bindings[command] = bindings
        .filter((binding) => binding && typeof binding === "object" && typeof binding.key === "string")
        .map(normalizeBinding);
    }

    const occupied = [];
    const reportedCollisions = new Set();
    for (const [command, bindings] of Object.entries(normalized.bindings)) {
      bindings.forEach((binding, index) => {
        for (const signature of physicalSignatures(binding)) {
          const collision = occupied.find((entry) => entry.signature === signature && scopesOverlap(entry.scope, binding.scope));
          if (collision) {
            const collisionId = [collision.command, command, collision.scope, binding.scope].join(":");
            if (!reportedCollisions.has(collisionId)) {
              reportedCollisions.add(collisionId);
              issues.push(issue("SHORTCUT_COLLISION", `$.bindings.${command}[${index}]`, `${command} collides with ${collision.command}`, {
                commands: [collision.command, command], signature, scopes: [collision.scope, binding.scope]
              }));
            }
          } else occupied.push({ command, scope: binding.scope, signature });
        }
      });
    }
    return { ok: issues.length === 0, issues, keymap: issues.length ? null : normalized };
  };

  const bindingMatchesEvent = (binding, event) => {
    const primaryPressed = event.metaKey || event.ctrlKey;
    if (binding.command && (!event.metaKey || event.ctrlKey)) return false;
    if (binding.primary && !primaryPressed) return false;
    if (binding.control && (!event.ctrlKey || event.metaKey)) return false;
    if (!binding.command && !binding.primary && !binding.control && primaryPressed) return false;
    if (Boolean(binding.alt) !== Boolean(event.altKey) || Boolean(binding.shift) !== Boolean(event.shiftKey)) return false;
    const expected = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
    const actual = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    return expected === actual;
  };

  const scopeMatches = (bindingScope, activeScope) =>
    bindingScope === "global" || bindingScope === "workspace" || bindingScope === activeScope;

  const resolveCommand = (event, bindings, activeScope = "canvas") =>
    Object.entries(bindings).find(([, candidates]) => candidates.some((candidate) => {
      const binding = normalizeBinding(candidate);
      return scopeMatches(binding.scope, activeScope) && bindingMatchesEvent(binding, event);
    }))?.[0] || null;

  const displayKey = (key) => ({ " ": "Space", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right" })[key] || (key.length === 1 ? key.toUpperCase() : key);
  const formatBinding = (candidate) => {
    const binding = normalizeBinding(candidate);
    const parts = [];
    if (binding.command) parts.push("Cmd");
    else if (binding.primary) parts.push("Cmd/Ctrl");
    if (binding.control) parts.push("Ctrl");
    if (binding.alt) parts.push("Alt");
    if (binding.shift) parts.push("Shift");
    parts.push(displayKey(binding.key));
    return parts.join("+");
  };

  const bindingFromEvent = (event, scope = "workspace") => {
    const isMac = typeof navigator !== "undefined"
      ? /Mac|iPhone|iPad/.test(navigator.platform)
      : typeof process !== "undefined" && process.platform === "darwin";
    return normalizeBinding({
    key: event.key,
    scope,
    primary: isMac ? event.metaKey : event.ctrlKey,
    command: false,
    control: isMac ? event.ctrlKey : false,
    alt: event.altKey,
    shift: event.shiftKey
    });
  };

  return { bindingFromEvent, clone, formatBinding, normalizeBinding, physicalSignatures, resolveCommand, scopesOverlap, validateKeymap };
});
