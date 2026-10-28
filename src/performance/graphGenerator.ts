import type { EvolutionEdgeType, EvolutionGraph, NodeStatus } from "../domain/evolutionGraph/types";

export const GRAPH_SIZES = [100, 500, 1000] as const;
export type PerformanceGraphSize = (typeof GRAPH_SIZES)[number];

const statuses: readonly NodeStatus[] = ["locked", "available", "acquired", "mastered"];
const edgeTypes: readonly EvolutionEdgeType[] = ["dependency", "evolution", "related"];

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** Produces stable, connected fixtures with branches, stages, lanes, and mixed edge types. */
export function generatePerformanceGraph(nodeCount: PerformanceGraphSize, seed = 0x5eed): EvolutionGraph {
  if (!GRAPH_SIZES.includes(nodeCount)) throw new Error(`Unsupported performance graph size: ${nodeCount}`);
  const random = mulberry32(seed ^ nodeCount);
  const branchCount = Math.min(8, Math.max(2, Math.ceil(nodeCount / 125)));
  const stageCount = 10;
  const laneCount = 5;
  const branches = Array.from({ length: branchCount }, (_, index) => ({
    id: `branch-${index}`,
    title: `Branch ${index}`,
    color: `hsl(${Math.round((index * 360) / branchCount)} 65% 50%)`,
  }));
  const stages = Array.from({ length: stageCount }, (_, index) => ({
    id: `stage-${index}`,
    title: `Stage ${index}`,
    order: index,
  }));
  const lanes = Array.from({ length: laneCount }, (_, index) => ({
    id: `lane-${index}`,
    title: `Lane ${index}`,
    coordinate: index,
  }));
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index.toString().padStart(4, "0")}`,
    title: `Node ${index}`,
    branchId: branches[index % branchCount].id,
    status: statuses[Math.floor(random() * statuses.length)],
    stageId: stages[Math.min(stageCount - 1, Math.floor((index * stageCount) / nodeCount))].id,
    laneId: lanes[Math.floor(random() * laneCount)].id,
  }));
  const edges = nodes.slice(1).flatMap((node, index) => {
    const targetIndex = index + 1;
    const primarySource = Math.floor((targetIndex - 1) / 2);
    const secondarySource = Math.floor(random() * targetIndex);
    const result = [
      {
        id: `edge-${targetIndex}-primary`,
        source: nodes[primarySource].id,
        target: node.id,
        type: edgeTypes[targetIndex % edgeTypes.length],
      },
    ];
    if (secondarySource !== primarySource) {
      result.push({
        id: `edge-${targetIndex}-secondary`,
        source: nodes[secondarySource].id,
        target: node.id,
        type: edgeTypes[Math.floor(random() * edgeTypes.length)],
      });
    }
    return result;
  });

  return {
    schemaVersion: 2,
    id: `performance-${nodeCount}-${seed >>> 0}`,
    title: `Deterministic performance graph (${nodeCount} nodes)`,
    branches,
    stages,
    lanes,
    nodes,
    edges,
    metadata: { generator: "src/performance/graphGenerator.ts", seed: seed >>> 0 },
  };
}
