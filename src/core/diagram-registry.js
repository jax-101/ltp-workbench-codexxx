const DIAGRAM_DEFINITIONS = Object.freeze({
  goalTree: Object.freeze({
    id: "goalTree",
    label: "Goal Tree",
    defaultDirection: "TB",
    layering: "distanceToSink",
    cycleBreaking: Object.freeze({ strategy: "greedyFeedbackArc", restoreSemanticEdges: true }),
    directions: Object.freeze(["TB", "BT", "LR", "RL"]),
    defaultRoutingStyle: "CURVED",
    routingStyles: Object.freeze([
      Object.freeze({ id: "CURVED", label: "Curved" }),
      Object.freeze({ id: "ORTHOGONAL", label: "Orthogonal" })
    ]),
    defaultNodeType: "necessaryCondition",
    nodeTypes: Object.freeze([
      Object.freeze({ id: "goal", label: "Goal", shortLabel: "Goal", unique: true }),
      Object.freeze({ id: "criticalSuccessFactor", label: "Critical Success Factor", shortLabel: "CSF" }),
      Object.freeze({ id: "necessaryCondition", label: "Necessary Condition", shortLabel: "NC" }),
      Object.freeze({ id: "assumption", label: "Assumption", shortLabel: "Assumption" })
    ])
  }),
  crt: Object.freeze({
    id: "crt",
    label: "Current Reality Tree",
    defaultDirection: "BT",
    layering: "distanceToSink",
    cycleBreaking: Object.freeze({ strategy: "greedyFeedbackArc", restoreSemanticEdges: true }),
    directions: Object.freeze(["BT", "TB", "LR", "RL"]),
    defaultRoutingStyle: "CURVED",
    routingStyles: Object.freeze([
      Object.freeze({ id: "CURVED", label: "Curved" }),
      Object.freeze({ id: "ORTHOGONAL", label: "Orthogonal" })
    ]),
    defaultNodeType: "entity",
    nodeTypes: Object.freeze([
      Object.freeze({ id: "entity", label: "Entity", shortLabel: "Entity" }),
      Object.freeze({ id: "ude", label: "Undesirable Effect", shortLabel: "UDE" }),
      Object.freeze({ id: "rootCause", label: "Root Cause", shortLabel: "RC" }),
      Object.freeze({ id: "criticalRootCause", label: "Critical Root Cause", shortLabel: "CRC" }),
      Object.freeze({ id: "junction", label: "Junction", shortLabel: "J", synthetic: true })
    ])
  }),
  ec: Object.freeze({
    id: "ec",
    label: "Evaporating Cloud",
    defaultDirection: "RL",
    layering: "canonicalRoles",
    cycleBreaking: Object.freeze({ strategy: "forbidden", restoreSemanticEdges: true }),
    directions: Object.freeze(["RL", "LR"]),
    defaultRoutingStyle: "CURVED",
    routingStyles: Object.freeze([
      Object.freeze({ id: "CURVED", label: "Curved" }),
      Object.freeze({ id: "ORTHOGONAL", label: "Orthogonal" })
    ]),
    defaultNodeType: "injection",
    nodeTypes: Object.freeze([
      Object.freeze({ id: "objective", label: "Objective", shortLabel: "A", semanticRole: "A" }),
      Object.freeze({ id: "need", label: "Need", shortLabel: "Need" }),
      Object.freeze({ id: "want", label: "Want", shortLabel: "Want" }),
      Object.freeze({ id: "injection", label: "Injection", shortLabel: "INJ" })
    ]),
    canonicalPresentation: Object.freeze({
      columns: Object.freeze([
        Object.freeze(["A"]),
        Object.freeze(["B", "C"]),
        Object.freeze(["D", "D_PRIME"])
      ]),
      parallelBranches: Object.freeze([
        Object.freeze(["D", "B", "A"]),
        Object.freeze(["D_PRIME", "C", "A"])
      ]),
      conflictRoles: Object.freeze(["D", "D_PRIME"])
    })
  })
});

const getDiagramDefinition = (type) => DIAGRAM_DEFINITIONS[type] || null;

const getNodeTypeDefinition = (diagramType, nodeType) =>
  getDiagramDefinition(diagramType)?.nodeTypes.find((candidate) => candidate.id === nodeType) || null;

const diagramRegistry = { DIAGRAM_DEFINITIONS, getDiagramDefinition, getNodeTypeDefinition };

if (typeof module !== "undefined" && module.exports) module.exports = diagramRegistry;
if (typeof globalThis !== "undefined") globalThis.LTP_DIAGRAM_REGISTRY = diagramRegistry;
