class DefinitionRuntimeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DefinitionRuntimeError";
    this.code = code;
    this.details = details;
  }
}

module.exports = { DefinitionRuntimeError };
