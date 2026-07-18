const { compileDefinition } = require("./capability-compiler");

function inspectDefinitionPackage(definitionPackage) {
  const compiled = compileDefinition(definitionPackage);
  const definition = definitionPackage.artifact.definition;
  return Object.freeze({
    contractVersion: 1,
    pin: compiled.pin,
    runtimeId: compiled.runtimeId,
    semanticDiagramType: compiled.semanticDiagramType,
    label: definition.label,
    description: definition.description || "",
    logicMode: definition.logicMode,
    cyclePolicy: definition.cyclePolicy,
    elementTypes: Object.freeze(definition.elementTypes.map((item) => item.id)),
    relationTypes: Object.freeze(definition.relationTypes.map((item) => item.id)),
    requiredKernelCapabilities: definition.requiredKernelCapabilities,
    fixturePaths: Object.freeze(definition.fixtures.map((item) => item.path)),
    resourceUsage: definitionPackage.resourceUsage || null
  });
}

module.exports = { inspectDefinitionPackage };
