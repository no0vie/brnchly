import { describe, expect, it } from "vitest";
import { routeEdges, type RoutableEdge } from "./index";

const positions = {
  a: { x: 0, y: 0 },
  b: { x: 300, y: 0 },
  c: { x: 300, y: 200 },
};
const nodeSize = { width: 100, height: 60 };
const edges: RoutableEdge[] = [
  { id: "z", source: "a", target: "b" },
  { id: "a", source: "a", target: "b" },
  { id: "ac", source: "a", target: "c" },
];

describe("routeEdges", () => {
  it("is deterministic regardless of input edge order", () => {
    expect(routeEdges(edges, positions, nodeSize, "horizontal")).toEqual(
      routeEdges([...edges].reverse(), positions, nodeSize, "horizontal"),
    );
  });

  it("uses opposite card boundaries and distinct parallel ports", () => {
    const routes = routeEdges(edges, positions, nodeSize, "horizontal");
    const first = routes.find(({ id }) => id === "a")!;
    const second = routes.find(({ id }) => id === "z")!;

    expect(first.sourcePoint.x).toBe(100);
    expect(first.targetPoint.x).toBe(300);
    expect(first.sourcePoint.y).not.toBe(second.sourcePoint.y);
    expect(first.targetPoint.y).not.toBe(second.targetPoint.y);
    expect(first.path).toMatch(/^M 100 /);
    expect(first.path).toContain(" C ");
  });

  it("uses bottom/top ports for vertical routing", () => {
    const [route] = routeEdges([{ id: "ac", source: "a", target: "c" }], positions, nodeSize, "vertical");

    expect(route.sourcePoint).toEqual({ x: 50, y: 60 });
    expect(route.targetPoint).toEqual({ x: 350, y: 200 });
    expect(route.path).toContain(" C ");
  });

  it("routes reverse edges from the nearest-facing sides", () => {
    const [route] = routeEdges([{ id: "ba", source: "b", target: "a" }], positions, nodeSize, "horizontal");

    expect(route.sourcePoint.x).toBe(300);
    expect(route.targetPoint.x).toBe(100);
  });

  it("skips edges whose endpoint position is missing", () => {
    expect(routeEdges([{ id: "missing", source: "a", target: "x" }], positions, nodeSize, "horizontal")).toEqual([]);
  });
});
