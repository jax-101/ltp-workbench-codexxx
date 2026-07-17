const path = require("node:path");

const contract = require(path.join(__dirname, "..", "..", "semantic-contract", "v0.1", "contract.json"));

const ASSUMPTION_STATUSES = Object.freeze([...(contract.assumptionStatuses || [])]);
const ASSUMPTION_STATUS_SET = new Set(ASSUMPTION_STATUSES);
const LEGACY_STATUS_ALIASES = Object.freeze({
  draft: "DRAFT",
  supported: "SUPPORTED",
  accepted: "SUPPORTED",
  challenged: "CHALLENGED",
  rejected: "INVALIDATED",
  invalidated: "INVALIDATED"
});

const normalizeAssumptionStatus = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value).trim();
  const canonical = text.toUpperCase();
  if (ASSUMPTION_STATUS_SET.has(canonical)) return canonical;
  return LEGACY_STATUS_ALIASES[text.toLowerCase()] || null;
};

module.exports = { ASSUMPTION_STATUSES, normalizeAssumptionStatus };
