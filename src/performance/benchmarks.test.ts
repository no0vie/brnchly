import { describe, expect, it } from "vitest";
import { benchmarkAlgorithmicSuite, summarizeSamples } from "./benchmarkHarness";
import { GRAPH_SIZES, generatePerformanceGraph } from "./graphGenerator";

describe("algorithmic performance benchmark harness (Node/Vitest; not browser measurements)", () => {
  it("generates deterministic 100/500/1000-node fixtures", () => {
    expect(GRAPH_SIZES).toEqual([100, 500, 1000]);

    for (const size of GRAPH_SIZES) {
      const first = generatePerformanceGraph(size, 0x5eed);
      const second = generatePerformanceGraph(size, 0x5eed);

      expect(first).toEqual(second);
      expect(first.nodes).toHaveLength(size);
      expect(first.edges.length).toBeGreaterThan(size);
      expect(new Set(first.nodes.map(({ id }) => id)).size).toBe(size);
    }
  });

  it("calculates median and nearest-rank p95 without mutating samples", () => {
    const samples = [9, 1, 5, 3, 7];

    expect(summarizeSamples(samples)).toEqual({ medianMs: 5, p95Ms: 9 });
    expect(samples).toEqual([9, 1, 5, 3, 7]);
  });

  it("runs reproducible layout, playback, traversal/index, and routing scenarios", () => {
    const results = benchmarkAlgorithmicSuite({ sizes: GRAPH_SIZES, iterations: 5, warmupIterations: 1 });

    expect(results).toHaveLength(GRAPH_SIZES.length * 5);
    expect(new Set(results.map(({ benchmark }) => benchmark))).toEqual(
      new Set(["layout", "playback-plan", "playback-snapshot", "traversal-index", "edge-routing"]),
    );
    for (const result of results) {
      expect(result.environment).toBe("Node/Vitest algorithmic (NOT browser measurement)");
      expect(result.samplesMs).toHaveLength(5);
      expect(result.medianMs).toBeGreaterThanOrEqual(0);
      expect(result.p95Ms).toBeGreaterThanOrEqual(result.medianMs);
    }

    console.table(
      results.map(({ benchmark, nodeCount, medianMs, p95Ms, environment }) => ({
        benchmark,
        nodes: nodeCount,
        "median (ms)": medianMs.toFixed(3),
        "p95 (ms)": p95Ms.toFixed(3),
        environment,
      })),
    );
  }, 30_000);
});
