const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const baseFixture = require("../definition-contract/v1/fixtures/minimal-valid.json");
const {
  DEFAULT_RESOURCE_LIMITS,
  DefinitionRuntimeError,
  createDefinitionPin,
  loadDefinition,
  resolvePinnedDefinition,
  validatePin
} = require("../src/core/definition-runtime");

const capabilities = ["semantic.graph.v1"];

async function expectCode(operation, code) {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof DefinitionRuntimeError);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`Expected ${code}`);
}

async function writePackage(root, definition, fixtureValue = { nodes: [{ id: "N1" }] }) {
  await fs.mkdir(path.join(root, "fixtures"), { recursive: true });
  await fs.writeFile(path.join(root, "diagram-definition.json"), `${JSON.stringify(definition, null, 2)}\n`);
  await fs.writeFile(path.join(root, "fixtures", "sample.json"), `${JSON.stringify(fixtureValue)}\n`);
}

async function main() {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ltp-definition-loader-"));
  try {
    const definition = structuredClone(baseFixture);
    definition.fixtures = [{ id: "sample", path: "fixtures/sample.json" }];
    const fixtureValue = { nodes: [{ id: "N1", statement: "Portable fixture" }] };
    const packageRoot = path.join(temporaryRoot, "valid");
    await writePackage(packageRoot, definition, fixtureValue);

    const directoryPackage = await loadDefinition(
      { kind: "directory", rootPath: packageRoot },
      { supportedCapabilities: capabilities }
    );
    const embeddedPackage = await loadDefinition(
      { kind: "embedded", definition, fixtures: { "fixtures/sample.json": fixtureValue } },
      { supportedCapabilities: capabilities }
    );
    assert.equal(directoryPackage.artifact.hash, embeddedPackage.artifact.hash, "all sources must use one identity path");
    assert.deepEqual(directoryPackage.fixtures, embeddedPackage.fixtures);
    assert(Object.isFrozen(directoryPackage) && Object.isFrozen(directoryPackage.fixtures["fixtures/sample.json"]));
    assert(directoryPackage.resourceUsage.totalBytes > 0);

    const pin = createDefinitionPin(directoryPackage);
    assert.deepEqual(validatePin(pin), pin);
    assert(Object.isFrozen(pin));
    assert.throws(() => validatePin({ ...pin, extra: true }), (error) => error.code === "DEFINITION_PIN_INVALID");
    assert.throws(() => createDefinitionPin({}), (error) => error.code === "DEFINITION_PIN_INVALID");
    assert.throws(
      () => createDefinitionPin({ definition: directoryPackage.artifact.definition, hash: `sha256:${"0".repeat(64)}` }),
      (error) => error.code === "DEFINITION_PIN_INVALID"
    );

    const ready = await resolvePinnedDefinition(
      { pin, sources: [{ kind: "directory", rootPath: packageRoot }] },
      { supportedCapabilities: capabilities }
    );
    assert.equal(ready.status, "ready");
    assert.equal(ready.access, "read-write");
    assert.equal(ready.package.artifact.hash, pin.hash);
    assert.deepEqual(ready.diagnostics, []);

    const snapshotReady = await resolvePinnedDefinition(
      { pin, snapshot: { definition, fixtures: { "fixtures/sample.json": fixtureValue } } },
      { supportedCapabilities: capabilities }
    );
    assert.equal(snapshotReady.status, "ready");
    assert.equal(snapshotReady.package.artifact.hash, pin.hash);

    const unsupported = await resolvePinnedDefinition(
      { pin, sources: [{ kind: "directory", rootPath: packageRoot }] },
      { supportedCapabilities: [] }
    );
    assert.equal(unsupported.status, "rescue");
    assert.equal(unsupported.access, "read-only");
    assert.equal(unsupported.package.artifact.hash, pin.hash, "safe content remains inspectable in rescue mode");
    assert(unsupported.diagnostics.some((item) => item.code === "DEFINITION_CAPABILITY_UNSUPPORTED"));

    const changed = structuredClone(definition);
    changed.label = "Changed published content";
    const mismatch = await resolvePinnedDefinition(
      { pin, sources: [{ kind: "embedded", definition: changed, fixtures: { "fixtures/sample.json": fixtureValue } }] },
      { supportedCapabilities: capabilities }
    );
    assert.equal(mismatch.status, "rescue");
    assert.equal(mismatch.package, null);
    assert(mismatch.diagnostics.some((item) => item.code === "DEFINITION_HASH_MISMATCH"));

    const missingPin = { ...pin, version: "9.0.0" };
    const missing = await resolvePinnedDefinition(
      { pin: missingPin, sources: [{ kind: "directory", rootPath: packageRoot }] },
      { supportedCapabilities: capabilities }
    );
    assert.equal(missing.status, "rescue");
    assert(missing.diagnostics.some((item) => item.code === "DEFINITION_VERSION_MISSING"));

    await expectCode(
      () => loadDefinition({ kind: "embedded", definition, fixtures: { "fixtures/sample.json": fixtureValue } }, {
        supportedCapabilities: []
      }),
      "DEFINITION_CAPABILITY_UNSUPPORTED"
    );
    await expectCode(() => loadDefinition({ kind: "memory", definition }, {}), "DEFINITION_SOURCE_INVALID");
    await expectCode(() => loadDefinition({ kind: "directory", rootPath: path.join(temporaryRoot, "absent") }, {
      supportedCapabilities: capabilities
    }), "DEFINITION_PACKAGE_MISSING");
    await expectCode(() => loadDefinition({ kind: "directory", rootPath: packageRoot }, {
      supportedCapabilities: capabilities,
      limits: { definitionBytes: 32 }
    }), "DEFINITION_RESOURCE_LIMIT");
    await expectCode(() => loadDefinition({ kind: "embedded", definition, fixtures: { "fixtures/sample.json": fixtureValue } }, {
      supportedCapabilities: capabilities,
      limits: { fixtureBytes: 8 }
    }), "DEFINITION_RESOURCE_LIMIT");

    let deep = "value";
    for (let index = 0; index < 70; index += 1) deep = [deep];
    await expectCode(() => loadDefinition({ kind: "embedded", definition: deep }, {
      supportedCapabilities: capabilities
    }), "DEFINITION_RESOURCE_LIMIT");
    const getterDefinition = structuredClone(definition);
    Object.defineProperty(getterDefinition, "hostile", {
      enumerable: true,
      get: () => { throw new Error("embedded getter executed"); }
    });
    await expectCode(() => loadDefinition({ kind: "embedded", definition: getterDefinition }, {
      supportedCapabilities: capabilities
    }), "DEFINITION_VALUE_NOT_JSON");
    await expectCode(() => loadDefinition({ kind: "embedded", definition }, {
      supportedCapabilities: capabilities,
      limits: { unknownLimit: 10 }
    }), "DEFINITION_RESOURCE_LIMIT");
    assert.equal(DEFAULT_RESOURCE_LIMITS.jsonDepth, 64);

    const badJsonRoot = path.join(temporaryRoot, "bad-json");
    await fs.mkdir(badJsonRoot);
    await fs.writeFile(path.join(badJsonRoot, "diagram-definition.json"), "{bad json");
    await expectCode(() => loadDefinition({ kind: "directory", rootPath: badJsonRoot }, {
      supportedCapabilities: capabilities
    }), "DEFINITION_JSON_INVALID");

    const badUtfRoot = path.join(temporaryRoot, "bad-utf8");
    await fs.mkdir(badUtfRoot);
    await fs.writeFile(path.join(badUtfRoot, "diagram-definition.json"), Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x7d]));
    await expectCode(() => loadDefinition({ kind: "directory", rootPath: badUtfRoot }, {
      supportedCapabilities: capabilities
    }), "DEFINITION_JSON_INVALID");

    const outsideFixture = path.join(temporaryRoot, "outside.json");
    await fs.writeFile(outsideFixture, JSON.stringify(fixtureValue));
    const symlinkRoot = path.join(temporaryRoot, "symlink-fixture");
    await writePackage(symlinkRoot, definition, fixtureValue);
    await fs.unlink(path.join(symlinkRoot, "fixtures", "sample.json"));
    await fs.symlink(outsideFixture, path.join(symlinkRoot, "fixtures", "sample.json"));
    const pathFailure = await expectCode(() => loadDefinition({ kind: "directory", rootPath: symlinkRoot }, {
      supportedCapabilities: capabilities
    }), "DEFINITION_PATH_FORBIDDEN");
    assert(!JSON.stringify(pathFailure.details).includes(temporaryRoot), "public diagnostics must not expose host paths");

    await expectCode(() => resolvePinnedDefinition({ pin, sources: [{}, {}] }, {
      supportedCapabilities: capabilities,
      limits: { sources: 1 }
    }), "DEFINITION_RESOURCE_LIMIT");
    await expectCode(() => resolvePinnedDefinition({ pin, sources: "not-an-array" }, {
      supportedCapabilities: capabilities
    }), "DEFINITION_SOURCE_INVALID");
    const snapshotCannotChangeKind = await resolvePinnedDefinition({
      pin,
      snapshot: {
        kind: "directory",
        rootPath: path.join(temporaryRoot, "absent"),
        definition,
        fixtures: { "fixtures/sample.json": fixtureValue }
      }
    }, { supportedCapabilities: capabilities });
    assert.equal(snapshotCannotChangeKind.status, "ready");

    const invalidSource = structuredClone(definition);
    invalidSource.defaultElementType = "MISSING";
    const safeFailure = await resolvePinnedDefinition(
      { pin, sources: [{ kind: "embedded", definition: invalidSource }] },
      { supportedCapabilities: capabilities }
    );
    assert.equal(safeFailure.status, "rescue");
    assert.equal(safeFailure.access, "read-only");
    assert(Object.isFrozen(safeFailure));
    assert(safeFailure.diagnostics.some((item) => item.code === "DEFINITION_INVALID"));

    console.log("Definition loader passed: source parity, confinement, budgets, pins and read-only rescue.");
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
