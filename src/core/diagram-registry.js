const DIAGRAM_DEFINITIONS = Object.freeze({
  goalTree: Object.freeze({
    id: "goalTree",
    label: "Goal Tree",
    defaultDirection: "TB",
    layering: "distanceToSink",
    directions: Object.freeze(["TB", "BT", "LR", "RL"]),
    defaultNodeType: "necessaryCondition",
    nodeTypes: Object.freeze([
      Object.freeze({ id: "goal", label: "Goal", shortLabel: "Goal", unique: true }),
      Object.freeze({ id: "criticalSuccessFactor", label: "Critical Success Factor", shortLabel: "CSF" }),
      Object.freeze({ id: "necessaryCondition", label: "Necessary Condition", shortLabel: "NC" }),
      Object.freeze({ id: "assumption", label: "Assumption", shortLabel: "Assumption" })
    ])
  })
});

const getDiagramDefinition = (type) => DIAGRAM_DEFINITIONS[type] || null;

const getNodeTypeDefinition = (diagramType, nodeType) =>
  getDiagramDefinition(diagramType)?.nodeTypes.find((candidate) => candidate.id === nodeType) || null;

const diagramRegistry = { DIAGRAM_DEFINITIONS, getDiagramDefinition, getNodeTypeDefinition };

if (typeof module !== "undefined" && module.exports) module.exports = diagramRegistry;
if (typeof globalThis !== "undefined") globalThis.LTP_DIAGRAM_REGISTRY = diagramRegistry;
