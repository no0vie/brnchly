import { createPlaybackPlan, snapshotAt } from "../graph/playback/plan";
import { routeEdges } from "../graph/routing";
import { createGraphIndex, traverseGraph } from "../graph/traversal";
import { layoutGraph } from "../layout";
import { generatePerformanceGraph, type PerformanceGraphSize } from "./graphGenerator";

export const ALGORITHMIC_ENVIRONMENT = "Node/Vitest algorithmic (NOT browser measurement)" as const;
export type AlgorithmicBenchmark =
  "layout" | "playback-plan" | "playback-snapshot" | "traversal-index" | "edge-routing";

export interface BenchmarkResult {
  benchmark: AlgorithmicBenchmark;
  nodeCount: PerformanceGraphSize;
  iterations: number;
  samplesMs: number[];
  medianMs: number;
  p95Ms: number;
  environment: typeof ALGORITHMIC_ENVIRONMENT;
}

export interface BenchmarkOptions {
  sizes?: readonly PerformanceGraphSize[];
  iterations?: number;
  warmupIterations?: number;
  seed?: number;
}

export function summarizeSamples(samplesMs: readonly number[]): Pick<BenchmarkResult, "medianMs" | "p95Ms"> {
  if (samplesMs.length === 0) throw new Error("At least one timing sample is required.");
  const sorted = [...samplesMs].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const p95Ms = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
  return { medianMs, p95Ms };
}

const measure = (operation: () => unknown, iterations: number, warmupIterations: number): number[] => {
  for (let index = 0; index < warmupIterations; index += 1) operation();
  return Array.from({ length: iterations }, () => {
    const startedAt = performance.now();
    operation();
    return performance.now() - startedAt;
  });
};

export function benchmarkAlgorithmicSuite(options: BenchmarkOptions = {}): BenchmarkResult[] {
  const sizes = options.sizes ?? [100, 500, 1000];
  const iterations = options.iterations ?? 9;
  const warmupIterations = options.warmupIterations ?? 2;
  const seed = options.seed ?? 0x5eed;
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations must be a positive integer.");
  if (!Number.isInteger(warmupIterations) || warmupIterations < 0)
    throw new Error("warmupIterations must be a non-negative integer.");

  return sizes.flatMap((nodeCount) => {
    const graph = generatePerformanceGraph(nodeCount, seed);
    const nodeIds = graph.nodes.map(({ id }) => id);
    const playbackConfig = {
      stageDuration: 500,
      transitionDuration: 100,
      speed: 1,
      autoplay: false,
      cameraMode: "follow" as const,
    };
    const playbackPlan = createPlaybackPlan(graph, playbackConfig);
    const layout = layoutGraph(graph, { strategy: "horizontal-dag" });
    const scenarios: ReadonlyArray<[AlgorithmicBenchmark, () => unknown]> = [
      ["layout", () => layoutGraph(graph, { strategy: "horizontal-dag" })],
      ["playback-plan", () => createPlaybackPlan(graph, playbackConfig)],
      ["playback-snapshot", () => snapshotAt(playbackPlan, { progress: 0.75 }, { progress: 0.25 })],
      [
        "traversal-index",
        () => {
          const index = createGraphIndex(graph.edges, nodeIds);
          return traverseGraph(index, nodeIds[0], "both");
        },
      ],
      ["edge-routing", () => routeEdges(graph.edges, layout.positions, layout.nodeSize, "horizontal")],
    ];

    return scenarios.map(([benchmark, operation]) => {
      const samplesMs = measure(operation, iterations, warmupIterations);
      return {
        benchmark,
        nodeCount,
        iterations,
        samplesMs,
        ...summarizeSamples(samplesMs),
        environment: ALGORITHMIC_ENVIRONMENT,
      };
    });
  });
}
