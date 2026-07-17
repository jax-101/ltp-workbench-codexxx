const fs = require("node:fs");
const path = require("node:path");
const { loadRegister, loadEffortLog, validateRegister } = require("./scope-status");

const root = path.join(__dirname, "..");
const effortPath = path.join(root, "planning", "effort-log.json");
const allowedStatuses = new Set(["tracking", "partial", "measured", "unavailable"]);

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must be --key value pairs");
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function nextEventId(events) {
  const highest = events.reduce((value, event) => (
    Math.max(value, Number.parseInt(event.id.slice(1), 10))
  ), 0);
  return `E${String(highest + 1).padStart(4, "0")}`;
}

function localDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function recordMeasurement(args) {
  const packages = validateRegister(loadRegister());
  if (!packages.has(args.package)) throw new Error(`Unknown package: ${args.package}`);
  if (!allowedStatuses.has(args.status)) throw new Error(`Invalid measurement status: ${args.status}`);
  if (!args.source) throw new Error("--source is required");

  const requiresTokens = args.status === "partial" || args.status === "measured";
  const actualTokens = args.tokens === undefined ? null : Number(args.tokens);
  if (requiresTokens && (!Number.isInteger(actualTokens) || actualTokens < 0)) {
    throw new Error("--tokens must be a non-negative integer for partial or measured status");
  }
  if (!requiresTokens && args.tokens !== undefined) {
    throw new Error("Do not provide --tokens for tracking or unavailable status");
  }

  const log = loadEffortLog();
  const now = new Date();
  const event = {
    id: nextEventId(log.measurements),
    packageId: args.package,
    recordedAt: now.toISOString(),
    status: args.status,
    actualTokens: requiresTokens ? actualTokens : null,
    source: args.source,
    note: args.note || ""
  };
  log.measurements.push(event);
  log.updated = localDate(now);
  fs.writeFileSync(effortPath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return event;
}

if (require.main === module) {
  try {
    const event = recordMeasurement(parseArguments(process.argv.slice(2)));
    console.log(
      `Recorded ${event.status} effort snapshot ${event.id} for ${event.packageId}` +
      (event.actualTokens === null ? "" : `: ${event.actualTokens} tokens`)
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { parseArguments, recordMeasurement };
