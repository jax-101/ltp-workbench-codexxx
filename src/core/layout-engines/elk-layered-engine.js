const ELK = require("elkjs/lib/elk.bundled.js");

const elkDirection = (direction) =>
  ({
    TB: "DOWN",
    BT: "UP",
    LR: "RIGHT",
    RL: "LEFT"
  })[direction] || "DOWN";

const strictConfigurations = (optimize) =>
  optimize
    ? [
        { placement: "BRANDES_KOEPF", seed: 1 },
        { placement: "BRANDES_KOEPF", seed: 2 },
        { placement: "BRANDES_KOEPF", seed: 4 },
        { placement: "NETWORK_SIMPLEX", seed: 4 },
        { placement: "NETWORK_SIMPLEX", seed: 7 }
      ]
    : [{ placement: "BRANDES_KOEPF", seed: 1 }];

const createElkLayeredEngine = () => {
  const elk = new ELK();

  return {
    id: "elk",

    async generateCandidates(problem) {
      const {
        containerId,
        items,
        edges,
        relaxedEdges,
        direction,
        spacingNodeNode,
        spacingLayer,
        rankPartitions,
        optimize
      } = problem;
      const strictConfigs = strictConfigurations(optimize);
      const configs = [
        ...strictConfigs.map((config) => ({ ...config, relaxed: false, edges })),
        ...(optimize && relaxedEdges
          ? [
              { placement: "NETWORK_SIMPLEX", seed: 7, relaxed: true, edges: relaxedEdges },
              { placement: "NETWORK_SIMPLEX", seed: 11, relaxed: true, edges: relaxedEdges },
              { placement: "BRANDES_KOEPF", seed: 2, relaxed: true, edges: relaxedEdges },
              { placement: "BRANDES_KOEPF", seed: 4, relaxed: true, edges: relaxedEdges }
            ]
          : [])
      ];
      const candidates = [];

      for (const config of configs) {
        const laidOut = await elk.layout({
          id: `container-${containerId}`,
          layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": elkDirection(direction),
            "elk.spacing.nodeNode": String(spacingNodeNode),
            "elk.layered.spacing.nodeNodeBetweenLayers": String(spacingLayer),
            "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
            "elk.edgeRouting": "ORTHOGONAL",
            ...(rankPartitions.size ? { "org.eclipse.elk.partitioning.activate": "true" } : {}),
            "elk.randomSeed": String(config.seed),
            "elk.layered.thoroughness": "30",
            "elk.layered.crossingMinimization.greedySwitch.type": "TWO_SIDED",
            "elk.layered.crossingMinimization.greedySwitch.activationThreshold": "0",
            "elk.layered.nodePlacement.strategy": config.placement,
            "elk.layered.nodePlacement.favorStraightEdges": "true",
            "elk.layered.nodePlacement.bk.edgeStraightening": "IMPROVE_STRAIGHTNESS"
          },
          children: items.map(({ id, width, height }) => ({
            id,
            width,
            height,
            ...(rankPartitions.has(id)
              ? { layoutOptions: { "org.eclipse.elk.partitioning.partition": String(rankPartitions.get(id)) } }
              : {})
          })),
          edges: config.edges
        });
        candidates.push({
          children: laidOut.children || [],
          config: { placement: config.placement, seed: config.seed, relaxed: config.relaxed }
        });
      }

      return candidates;
    }
  };
};

module.exports = { createElkLayeredEngine };
