import { describe, expect, it } from "vitest";
import type { EvolutionGraph } from "../domain/evolutionGraph";
import { layoutGraph, type LayoutResult } from "./index";

const graph = (overrides: Partial<EvolutionGraph> = {}): EvolutionGraph => ({
  schemaVersion: 2,
  id: "g",
  title: "Graph",
  branches: [{ id: "b", title: "Branch", color: "#fff" }],
  nodes: [],
  edges: [],
  ...overrides,
});

const rectanglesOverlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const positionedRectangles = (result: LayoutResult) =>
  Object.values(result.positions).map(({ x, y }) => ({
    x,
    y,
    width: result.nodeSize.width,
    height: result.nodeSize.height,
  }));

describe("layoutGraph", () => {
  it("returns stable zero bounds for an empty graph", () => {
    expect(layoutGraph(graph(), { strategy: "horizontal-dag" })).toEqual({
      positions: {},
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      nodeSize: { width: 160, height: 72 },
      regions: [],
    });
  });

  it("layers horizontal DAGs deterministically while ignoring related edges", () => {
    const input = graph({
      nodes: ["a", "b", "c", "d"].map((id) => ({ id, title: id, branchId: "b", status: "available" })),
      edges: [
        { id: "ab", source: "a", target: "b", type: "dependency" },
        { id: "cb", source: "c", target: "b", type: "evolution" },
        { id: "bd-related", source: "b", target: "d", type: "related" },
      ],
    });
    const first = layoutGraph(input, { strategy: "horizontal-dag" });
    const second = layoutGraph(input, { strategy: "horizontal-dag" });

    expect(first).toEqual(second);
    expect(first.positions.b.x).toBeGreaterThan(first.positions.a.x);
    expect(first.positions.b.x).toBeGreaterThan(first.positions.c.x);
    expect(first.positions.d.x).toBe(0);
  });

  it("handles cycles, multiple parents, roots, and disconnected nodes without overlap", () => {
    const input = graph({
      nodes: ["a", "b", "c", "d", "e"].map((id) => ({ id, title: id, branchId: "b", status: "available" })),
      edges: [
        { id: "ab", source: "a", target: "b", type: "dependency" },
        { id: "bc", source: "b", target: "c", type: "dependency" },
        { id: "ca", source: "c", target: "a", type: "dependency" },
        { id: "dc", source: "d", target: "c", type: "evolution" },
      ],
    });
    const result = layoutGraph(input, { strategy: "vertical-dag" });
    const rectangles = positionedRectangles(result);

    expect(Object.keys(result.positions)).toHaveLength(5);
    for (let left = 0; left < rectangles.length; left += 1) {
      for (let right = left + 1; right < rectangles.length; right += 1) {
        expect(rectanglesOverlap(rectangles[left], rectangles[right])).toBe(false);
      }
    }
  });

  it("uses explicit positions in manual mode and deterministic fallbacks", () => {
    const input = graph({
      nodes: [
        { id: "b", title: "B", branchId: "b", status: "available" },
        { id: "a", title: "A", branchId: "b", status: "available", position: { x: 23, y: 42 } },
      ],
    });
    const result = layoutGraph(input, { strategy: "manual" });

    expect(result.positions.a).toEqual({ x: 23, y: 42 });
    expect(result.positions.b).toEqual({ x: 0, y: 0 });
  });

  it.each(["radial", "radial-tree"] as const)("supports deterministic %s layouts", (strategy) => {
    const input = graph({
      nodes: Array.from({ length: 8 }, (_, index) => ({
        id: `n${index}`,
        title: `${index}`,
        branchId: "b",
        status: "available" as const,
      })),
    });
    const result = layoutGraph(input, { strategy });
    expect(Object.keys(result.positions)).toHaveLength(8);
    expect(new Set(Object.values(result.positions).map(({ x, y }) => `${x},${y}`)).size).toBe(8);
  });

  it("sizes stage/lane cells dynamically, packs nodes, and exposes header/lane regions", () => {
    const input = graph({
      stages: [
        { id: "s2", title: "Advanced", order: 2 },
        { id: "s1", title: "Foundations", order: 1 },
      ],
      lanes: [
        { id: "l2", title: "Backend", coordinate: 20 },
        { id: "l1", title: "Frontend", coordinate: 10 },
      ],
      nodes: Array.from({ length: 7 }, (_, index) => ({
        id: `n${index}`,
        title: `${index}`,
        branchId: "b",
        status: "available" as const,
        stageId: index < 6 ? "s1" : "s2",
        laneId: index < 6 ? "l1" : "l2",
      })),
    });
    const result = layoutGraph(input, { strategy: "stage-lane", nodeSize: { width: 100, height: 40 } });
    const rectangles = positionedRectangles(result);

    expect(result.regions.filter((region) => region.kind === "stage")).toHaveLength(2);
    expect(result.regions.filter((region) => region.kind === "lane")).toHaveLength(2);
    expect(result.regions.find((region) => region.id === "s1")!.width).toBeGreaterThan(
      result.regions.find((region) => region.id === "s2")!.width,
    );
    for (let left = 0; left < rectangles.length; left += 1) {
      for (let right = left + 1; right < rectangles.length; right += 1) {
        expect(rectanglesOverlap(rectangles[left], rectangles[right])).toBe(false);
      }
    }
  });

  it("lays out 150 nodes deterministically", () => {
    const nodes = Array.from({ length: 150 }, (_, index) => ({
      id: `n${index}`,
      title: `${index}`,
      branchId: "b",
      status: "available" as const,
    }));
    const edges = nodes.slice(1).map((node, index) => ({
      id: `e${index}`,
      source: nodes[Math.floor(index / 2)].id,
      target: node.id,
      type: "dependency" as const,
    }));
    const input = graph({ nodes, edges });

    expect(layoutGraph(input, { strategy: "horizontal-dag" })).toEqual(
      layoutGraph(input, { strategy: "horizontal-dag" }),
    );
  });
});
