const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const inventory = JSON.parse(fs.readFileSync(
  path.join(root, "architecture", "interaction-inventory.json"),
  "utf8"
));
const workPackages = JSON.parse(fs.readFileSync(
  path.join(root, "planning", "work-packages.json"),
  "utf8"
));
const normalize = (filePath) => filePath.split(path.sep).join("/");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}

function assertSameSet(actual, expected, label) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}

assert.equal(inventory.schemaVersion, 1, "Unsupported interaction inventory");
const moduleIds = new Set(inventory.modules.map((module) => module.id));
assert.equal(moduleIds.size, inventory.modules.length, "Duplicate module IDs");

const ownership = new Map();
for (const item of inventory.sourceOwnership) {
  assert(!ownership.has(item.path), `Duplicate source ownership: ${item.path}`);
  assert(moduleIds.has(item.owner), `Unknown owner ${item.owner} for ${item.path}`);
  ownership.set(item.path, item.owner);
}

const discoveredSources = new Set([
  ...walk(path.join(root, "src"))
    .filter((file) => /\.(js|css|html)$/.test(file))
    .map((file) => normalize(path.relative(root, file))),
  "scripts/ltp-cli.js",
  "scripts/definition-cli.js"
]);
assertSameSet(new Set(ownership.keys()), discoveredSources, "Source ownership inventory is stale");

const interactionById = new Map();
const packageIds = new Set(workPackages.packages.map((item) => item.id));
for (const interaction of inventory.interactions) {
  assert(!interactionById.has(interaction.id), `Duplicate interaction ID: ${interaction.id}`);
  assert(moduleIds.has(interaction.consumer), `Unknown consumer in ${interaction.id}`);
  assert(moduleIds.has(interaction.provider), `Unknown provider in ${interaction.id}`);
  assert(["explicit", "implicit", "debt"].includes(interaction.status), `Invalid status in ${interaction.id}`);
  assert(interaction.mechanism && Array.isArray(interaction.data) && Array.isArray(interaction.errors),
    `Incomplete contract shape in ${interaction.id}`);
  assert(interaction.formalizationPackages?.length > 0, `${interaction.id} has no formalization path`);
  for (const packageId of interaction.formalizationPackages) {
    assert(packageIds.has(packageId), `${interaction.id} references missing ${packageId}`);
  }
  for (const consumer of interaction.additionalConsumers || []) {
    assert(moduleIds.has(consumer), `Unknown additional consumer in ${interaction.id}`);
  }
  interactionById.set(interaction.id, interaction);
}

const extractedDependencies = new Map();
for (const [source, sourceOwner] of ownership) {
  if (!source.endsWith(".js")) continue;
  const sourceDirectory = path.posix.dirname(source);
  for (const match of read(source).matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
    let target = path.posix.normalize(path.posix.join(sourceDirectory, match[1]));
    if (!path.posix.extname(target)) target += ".js";
    const targetOwner = ownership.get(target);
    if (!targetOwner || targetOwner === sourceOwner) continue;
    extractedDependencies.set(`${source}->${target}`, { source, target, sourceOwner, targetOwner });
  }
}

const declaredDependencies = new Map();
for (const dependency of inventory.dependencies) {
  const key = `${dependency.from}->${dependency.to}`;
  assert(!declaredDependencies.has(key), `Duplicate dependency: ${key}`);
  const interaction = interactionById.get(dependency.interaction);
  assert(interaction, `Missing interaction ${dependency.interaction} for ${key}`);
  const sourceOwner = ownership.get(dependency.from);
  const targetOwner = ownership.get(dependency.to);
  assert(sourceOwner && targetOwner && sourceOwner !== targetOwner, `Dependency is not cross-module: ${key}`);
  const allowedConsumers = new Set([interaction.consumer, ...(interaction.additionalConsumers || [])]);
  assert(allowedConsumers.has(sourceOwner), `${key} has wrong consumer contract ${interaction.id}`);
  assert.equal(interaction.provider, targetOwner, `${key} has wrong provider contract ${interaction.id}`);
  declaredDependencies.set(key, dependency);
}
assertSameSet(
  new Set(declaredDependencies.keys()),
  new Set(extractedDependencies.keys()),
  "Cross-module dependency inventory is stale"
);

const htmlSource = "src/renderer/index.html";
const htmlOwner = ownership.get(htmlSource);
const extractedScripts = new Map();
for (const match of read(htmlSource).matchAll(/<script\s+src="([^"]+)"/g)) {
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(htmlSource), match[1]));
  const targetOwner = ownership.get(target);
  if (targetOwner && targetOwner !== htmlOwner) {
    extractedScripts.set(`${htmlSource}->${target}`, { source: htmlSource, target });
  }
}
const declaredScripts = new Map();
for (const dependency of inventory.scriptDependencies) {
  const key = `${dependency.from}->${dependency.to}`;
  assert(!declaredScripts.has(key), `Duplicate script dependency: ${key}`);
  const interaction = interactionById.get(dependency.interaction);
  assert(interaction, `Missing script interaction ${dependency.interaction}`);
  assert.equal(interaction.consumer, ownership.get(dependency.from), `Wrong script consumer for ${key}`);
  assert.equal(interaction.provider, ownership.get(dependency.to), `Wrong script provider for ${key}`);
  declaredScripts.set(key, dependency);
}
assertSameSet(
  new Set(declaredScripts.keys()),
  new Set(extractedScripts.keys()),
  "Browser script dependency inventory is stale"
);

const preloadMethods = new Map(
  [...read("src/preload.js").matchAll(/^\s*(\w+):.*ipcRenderer\.invoke\("([^"]+)"/gm)]
    .map((match) => [match[1], match[2]])
);
const mainChannels = new Set(
  [...read("src/main.js").matchAll(/ipcMain\.handle\("([^"]+)"/g)].map((match) => match[1])
);
const inventoryMethods = new Map();
for (const channel of inventory.ipcChannels) {
  assert(!inventoryMethods.has(channel.method), `Duplicate IPC method: ${channel.method}`);
  assert(interactionById.has(channel.interaction), `Missing IPC interaction: ${channel.interaction}`);
  inventoryMethods.set(channel.method, channel.channel);
}
assertSameSet(new Set(inventoryMethods.keys()), new Set(preloadMethods.keys()), "Preload method inventory is stale");
assertSameSet(new Set(inventoryMethods.values()), mainChannels, "Main IPC channel inventory is stale");
for (const [method, channel] of preloadMethods) {
  assert.equal(inventoryMethods.get(method), channel, `IPC mapping changed for ${method}`);
}

const rendererMethods = new Set(
  [...read("src/renderer/app.js").matchAll(/ltpPrototype\.(\w+)/g)].map((match) => match[1])
);
for (const method of rendererMethods) {
  assert(inventoryMethods.has(method), `Renderer uses undeclared bridge method: ${method}`);
}

console.log(
  `Contract inventory passed: ${ownership.size} owned sources, ${declaredDependencies.size} ` +
  `cross-module imports, ${declaredScripts.size} browser-global dependencies, ` +
  `${inventoryMethods.size} IPC methods and ${interactionById.size} interactions.`
);
