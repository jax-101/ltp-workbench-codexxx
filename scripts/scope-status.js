const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(root, relativePath), "utf8")
);
const allowedPackageStatuses = new Set(["done", "partial", "planned"]);
const allowedMeasurementStatuses = new Set(["tracking", "partial", "measured", "unavailable"]);
const allowedUnknownStatuses = new Set(["open", "assessed", "converted", "mitigated", "resolved", "deferred"]);

const loadRegister = () => readJson("planning/work-packages.json");
const loadEffortLog = () => readJson("planning/effort-log.json");
const loadUnknowns = () => readJson("planning/unknowns.json");

function validateRegister(register) {
  if (register.schemaVersion !== 1 || !Array.isArray(register.packages)) {
    throw new Error("Unsupported work-package register");
  }

  const ids = new Set();
  for (const item of register.packages) {
    if (!/^P\d{2,}$/.test(item.id) || ids.has(item.id)) {
      throw new Error(`Invalid or duplicate work-package ID: ${item.id}`);
    }
    if (!allowedPackageStatuses.has(item.status)) {
      throw new Error(`Invalid status for ${item.id}: ${item.status}`);
    }
    if (!Number.isInteger(item.estimatedTokens) || item.estimatedTokens <= 0) {
      throw new Error(`Invalid estimate for ${item.id}`);
    }
    if (item.revisedEstimateTokens !== undefined &&
        (!Number.isInteger(item.revisedEstimateTokens) || item.revisedEstimateTokens <= 0)) {
      throw new Error(`Invalid revised estimate for ${item.id}`);
    }
    if (typeof item.completion !== "number" || item.completion < 0 || item.completion > 100) {
      throw new Error(`Invalid completion for ${item.id}`);
    }
    if (item.status === "done" && item.completion !== 100) {
      throw new Error(`${item.id} is done but completion is not 100`);
    }
    if (item.status === "planned" && item.completion !== 0) {
      throw new Error(`${item.id} is planned but completion is not 0`);
    }
    if (item.status === "partial" && (item.completion === 0 || item.completion === 100)) {
      throw new Error(`${item.id} is partial but has a boundary completion value`);
    }
    ids.add(item.id);
  }
  return ids;
}

function validateEffortLog(effortLog, register, packageIds) {
  if (effortLog.schemaVersion !== 1 || !Array.isArray(effortLog.measurements) ||
      !Array.isArray(effortLog.estimateRevisions)) {
    throw new Error("Unsupported effort log");
  }
  const eventIds = new Set();
  const historicalIds = effortLog.policy?.historicalUnavailablePackageIds;
  if (!Array.isArray(historicalIds) || historicalIds.some((id) => !packageIds.has(id))) {
    throw new Error("Effort log has invalid historical coverage");
  }
  for (const event of effortLog.measurements) {
    if (!/^E\d{4,}$/.test(event.id) || eventIds.has(event.id)) {
      throw new Error(`Invalid or duplicate effort event: ${event.id}`);
    }
    if (!packageIds.has(event.packageId) || !allowedMeasurementStatuses.has(event.status)) {
      throw new Error(`Invalid effort event target or status: ${event.id}`);
    }
    const requiresTokens = event.status === "partial" || event.status === "measured";
    if (requiresTokens !== (Number.isInteger(event.actualTokens) && event.actualTokens >= 0)) {
      throw new Error(`Invalid actual-token value for ${event.id}`);
    }
    eventIds.add(event.id);
  }

  const latestActualByPackage = new Map();
  for (const event of effortLog.measurements) {
    const previous = latestActualByPackage.get(event.packageId);
    if (event.actualTokens !== null && previous?.actualTokens !== null &&
        event.actualTokens < previous.actualTokens) {
      throw new Error(`Actual effort decreases between snapshots for ${event.packageId}`);
    }
    latestActualByPackage.set(event.packageId, event);
  }

  const revisionIds = new Set();
  const revisionValues = new Map(register.packages.map((item) => [item.id, item.estimatedTokens]));
  for (const revision of effortLog.estimateRevisions) {
    if (!/^R\d{4,}$/.test(revision.id) || revisionIds.has(revision.id) ||
        !packageIds.has(revision.packageId)) {
      throw new Error(`Invalid or duplicate estimate revision: ${revision.id}`);
    }
    if (!Number.isInteger(revision.previousTokens) || revision.previousTokens <= 0 ||
        !Number.isInteger(revision.revisedTokens) || revision.revisedTokens <= 0 ||
        !revision.reason) {
      throw new Error(`Invalid estimate revision values: ${revision.id}`);
    }
    if (revision.previousTokens !== revisionValues.get(revision.packageId)) {
      throw new Error(`Broken estimate revision chain: ${revision.id}`);
    }
    if (!Array.isArray(revision.evidenceEvents) || revision.evidenceEvents.length === 0 ||
        revision.evidenceEvents.some((id) => !eventIds.has(id))) {
      throw new Error(`Invalid estimate revision evidence: ${revision.id}`);
    }
    revisionValues.set(revision.packageId, revision.revisedTokens);
    revisionIds.add(revision.id);
  }
}

function validateUnknowns(unknownRegister, register, packageIds) {
  if (unknownRegister.schemaVersion !== 1 || !Array.isArray(unknownRegister.unknowns)) {
    throw new Error("Unsupported unknown register");
  }
  const unknownIds = new Set();
  const unknownsById = new Map();
  const packagesById = new Map(register.packages.map((item) => [item.id, item]));
  for (const unknown of unknownRegister.unknowns) {
    if (!/^U\d{3,}$/.test(unknown.id) || unknownIds.has(unknown.id) ||
        !allowedUnknownStatuses.has(unknown.status)) {
      throw new Error(`Invalid or duplicate unknown: ${unknown.id}`);
    }
    for (const packageId of unknown.resultingPackages || []) {
      if (!packageIds.has(packageId)) throw new Error(`${unknown.id} references missing ${packageId}`);
      const origins = packagesById.get(packageId).originUnknownIds || [];
      if (!origins.includes(unknown.id)) {
        throw new Error(`${unknown.id} -> ${packageId} is not bidirectional`);
      }
    }
    if (unknown.scopeAddedTokens !== null &&
        (!Number.isInteger(unknown.scopeAddedTokens) || unknown.scopeAddedTokens < 0)) {
      throw new Error(`${unknown.id} has invalid added scope`);
    }
    unknownsById.set(unknown.id, unknown);
    unknownIds.add(unknown.id);
  }
  for (const item of register.packages) {
    for (const unknownId of item.originUnknownIds || []) {
      if (!unknownIds.has(unknownId)) throw new Error(`${item.id} references missing ${unknownId}`);
      if (!(unknownsById.get(unknownId).resultingPackages || []).includes(item.id)) {
        throw new Error(`${item.id} -> ${unknownId} is not bidirectional`);
      }
    }
  }
}

function latestMeasurements(events) {
  return new Map(events.map((event) => [event.packageId, event]));
}

function summarize(register, effortLog = loadEffortLog(), unknownRegister = loadUnknowns()) {
  const packageIds = validateRegister(register);
  validateEffortLog(effortLog, register, packageIds);
  validateUnknowns(unknownRegister, register, packageIds);
  const latestRevisions = new Map(
    effortLog.estimateRevisions.map((revision) => [revision.packageId, revision])
  );
  for (const item of register.packages) {
    const revision = latestRevisions.get(item.id);
    if ((item.revisedEstimateTokens || null) !== (revision?.revisedTokens || null)) {
      throw new Error(`${item.id} revised estimate is not synchronized with the effort log`);
    }
  }
  const latestActuals = latestMeasurements(effortLog.measurements);
  const historicalUnavailable = new Set(effortLog.policy.historicalUnavailablePackageIds);
  for (const item of register.packages.filter((candidate) => candidate.status !== "planned")) {
    if (!latestActuals.has(item.id) && !historicalUnavailable.has(item.id)) {
      throw new Error(`${item.id} has started without an actual-effort tracking event`);
    }
  }

  const summary = register.packages.reduce((result, item) => {
    const estimate = item.revisedEstimateTokens || item.estimatedTokens;
    result.baselineTokens += item.estimatedTokens;
    result.estimatedTokens += estimate;
    result.earnedTokens += estimate * item.completion / 100;
    result.statusCounts[item.status] += 1;
    if (item.status !== "planned") {
      result.startedPackages += 1;
      const actual = latestActuals.get(item.id);
      if (actual?.status === "measured") {
        result.measuredPackages += 1;
        result.actualTokens += actual.actualTokens;
        result.measuredEstimateTokens += estimate;
      } else if (actual?.status === "partial") {
        result.partialMeasurementPackages += 1;
        result.actualTokens += actual.actualTokens;
      } else if (actual?.status === "unavailable" || historicalUnavailable.has(item.id)) {
        result.unavailableActualPackages += 1;
      }
    }
    const actual = latestActuals.get(item.id);
    const actualStatus = actual?.status || (historicalUnavailable.has(item.id)
      ? "historical-unavailable"
      : "not-started");
    result.packageMetrics.push({
      id: item.id,
      baselineEstimateTokens: item.estimatedTokens,
      currentEstimateTokens: estimate,
      actualStatus,
      actualTokens: actual?.actualTokens ?? null,
      varianceTokens: actual?.status === "measured" ? actual.actualTokens - estimate : null,
      variancePercent: actual?.status === "measured"
        ? (actual.actualTokens - estimate) / estimate * 100
        : null
    });
    return result;
  }, {
    packageCount: register.packages.length,
    startedPackages: 0,
    baselineTokens: 0,
    estimatedTokens: 0,
    earnedTokens: 0,
    actualTokens: 0,
    measuredEstimateTokens: 0,
    measuredPackages: 0,
    partialMeasurementPackages: 0,
    unavailableActualPackages: 0,
    packageMetrics: [],
    statusCounts: { done: 0, partial: 0, planned: 0 }
  });

  summary.remainingTokens = summary.estimatedTokens - summary.earnedTokens;
  summary.progressPercent = summary.earnedTokens / summary.estimatedTokens * 100;
  summary.actualCoveragePercent = summary.startedPackages === 0
    ? 0
    : summary.measuredPackages / summary.startedPackages * 100;
  summary.calibrationRatio = summary.measuredEstimateTokens === 0
    ? null
    : summary.actualTokens / summary.measuredEstimateTokens;
  summary.unknownStatusCounts = Object.fromEntries(
    [...allowedUnknownStatuses].map((status) => [
      status,
      unknownRegister.unknowns.filter((item) => item.status === status).length
    ])
  );
  summary.unknownCount = unknownRegister.unknowns.length;
  summary.uncertaintyPercent = register.uncertaintyPercent;
  summary.updated = register.updated;
  return summary;
}

function formatMillions(tokens) {
  return `${(tokens / 1000000).toFixed(3)} M`;
}

function printSummary(summary) {
  console.log(`Scope progress: ${summary.progressPercent.toFixed(1)}%`);
  console.log(`Earned effort: ${formatMillions(summary.earnedTokens)} estimated working tokens`);
  console.log(`Total scope: ${formatMillions(summary.estimatedTokens)} estimated working tokens`);
  console.log(`Remaining: ${formatMillions(summary.remainingTokens)} estimated working tokens`);
  console.log(
    `Packages: ${summary.statusCounts.done} done, ${summary.statusCounts.partial} partial, ` +
    `${summary.statusCounts.planned} planned (${summary.packageCount} total)`
  );
  console.log(
    `Actual effort coverage: ${summary.measuredPackages}/${summary.startedPackages} packages ` +
    `fully measured (${summary.actualCoveragePercent.toFixed(1)}%); ${summary.actualTokens} tokens recorded; ` +
    `${summary.unavailableActualPackages} unavailable`
  );
  if (summary.calibrationRatio !== null) {
    console.log(`Measured actual/current-estimate ratio: ${summary.calibrationRatio.toFixed(2)}x`);
  }
  console.log(
    `Unknowns: ${summary.unknownCount} tracked; ${summary.unknownStatusCounts.open} open, ` +
    `${summary.unknownStatusCounts.assessed} assessed, ${summary.unknownStatusCounts.converted} converted, ` +
    `${summary.unknownStatusCounts.mitigated} mitigated, ${summary.unknownStatusCounts.resolved} resolved`
  );
  console.log(`Estimate uncertainty: +/-${summary.uncertaintyPercent}%`);
}

if (require.main === module) {
  const summary = summarize(loadRegister());
  if (process.argv.includes("--json")) console.log(JSON.stringify(summary, null, 2));
  else printSummary(summary);
}

module.exports = { loadRegister, loadEffortLog, loadUnknowns, validateRegister, summarize };
