class LtpError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "LtpError";
    this.code = code;
    this.details = details;
  }
}

module.exports = { LtpError };
