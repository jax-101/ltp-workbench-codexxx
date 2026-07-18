const officialRegistry = typeof module !== "undefined" && module.exports
  ? require("../generated/official-diagram-registry")
  : globalThis.LTP_OFFICIAL_DIAGRAM_REGISTRY;

if (!officialRegistry) throw new Error("Official diagram definition registry is unavailable");

const DIAGRAM_DEFINITIONS = officialRegistry.definitions;
const SEMANTIC_PROFILES = officialRegistry.semanticProfiles;
const DEFINITION_PINS = officialRegistry.pins;

const getDiagramDefinition = (type) => DIAGRAM_DEFINITIONS[type] || null;

const getNodeTypeDefinition = (diagramType, nodeType) =>
  getDiagramDefinition(diagramType)?.nodeTypes.find((candidate) => candidate.id === nodeType) || null;
const getSemanticProfile = (diagramType) => SEMANTIC_PROFILES[diagramType] || null;

const diagramRegistry = {
  DIAGRAM_DEFINITIONS,
  SEMANTIC_PROFILES,
  DEFINITION_PINS,
  getDiagramDefinition,
  getNodeTypeDefinition,
  getSemanticProfile
};

if (typeof module !== "undefined" && module.exports) module.exports = diagramRegistry;
if (typeof globalThis !== "undefined") globalThis.LTP_DIAGRAM_REGISTRY = diagramRegistry;
