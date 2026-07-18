const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");
const { DefinitionRuntimeError } = require("./errors");

const ENTRY_PATH = "diagram-definition.json";

function pathError(message, relativePath) {
  return new DefinitionRuntimeError("DEFINITION_PATH_FORBIDDEN", message, { relativePath });
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath) || relativePath.includes("\\")) {
    throw pathError("Definition package paths must be portable relative paths", relativePath);
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw pathError("Definition package path escapes its root", relativePath);
  }
  return segments;
}

async function resolvePackageRoot(rootPath) {
  if (typeof rootPath !== "string" || !rootPath.trim()) {
    throw new DefinitionRuntimeError("DEFINITION_PACKAGE_MISSING", "Definition package root is required");
  }
  try {
    const realRoot = await fs.realpath(rootPath);
    const stat = await fs.stat(realRoot);
    if (!stat.isDirectory()) throw new Error("NOT_DIRECTORY");
    return realRoot;
  } catch (error) {
    throw new DefinitionRuntimeError("DEFINITION_PACKAGE_MISSING", "Definition package root is unavailable");
  }
}

async function readConfinedFile(realRoot, relativePath, budget, byteLimit, resource) {
  const segments = validateRelativePath(relativePath);
  let candidate = realRoot;
  let handle;
  try {
    for (const segment of segments) {
      candidate = path.join(candidate, segment);
      const stat = await fs.lstat(candidate);
      if (stat.isSymbolicLink()) throw pathError("Definition package symlinks are not allowed", relativePath);
    }
    handle = await fs.open(candidate, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const stat = await handle.stat();
    if (!stat.isFile()) throw pathError("Definition package resource is not a regular file", relativePath);
    budget.consume(stat.size, resource, byteLimit);
    const realCandidate = await fs.realpath(candidate);
    const confinedPath = path.relative(realRoot, realCandidate);
    if (confinedPath.startsWith("..") || path.isAbsolute(confinedPath)) {
      throw pathError("Definition package resource escapes its root", relativePath);
    }
    const pathStat = await fs.stat(realCandidate);
    if (pathStat.dev !== stat.dev || pathStat.ino !== stat.ino) {
      throw pathError("Definition package resource changed while opening", relativePath);
    }
    const buffer = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    const overflow = Buffer.alloc(1);
    const extra = await handle.read(overflow, 0, 1, stat.size);
    if (offset !== stat.size || extra.bytesRead) {
      throw pathError("Definition package resource changed while loading", relativePath);
    }
    return buffer;
  } catch (error) {
    if (error instanceof DefinitionRuntimeError) throw error;
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw new DefinitionRuntimeError("DEFINITION_PACKAGE_MISSING", "Definition package resource is missing", {
        relativePath
      });
    }
    throw pathError("Definition package resource cannot be read safely", relativePath);
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

function parseJson(buffer, relativePath) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return JSON.parse(text);
  } catch (error) {
    throw new DefinitionRuntimeError("DEFINITION_JSON_INVALID", "Definition package resource is not valid JSON", {
      relativePath
    });
  }
}

async function readConfinedJson(realRoot, relativePath, budget, byteLimit, resource) {
  return parseJson(await readConfinedFile(realRoot, relativePath, budget, byteLimit, resource), relativePath);
}

module.exports = { ENTRY_PATH, readConfinedJson, resolvePackageRoot, validateRelativePath };
