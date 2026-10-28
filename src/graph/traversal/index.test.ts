import { describe, expect, it } from "vitest";
import { createGraphIndex, traverseGraph, type TraversalEdge } from "./index";

const edges: TraversalEdge[] = [
  { id: "ab", source: "a", target: "b", type: "dependency" },
  { id: "bc", source: "b", target: "c", type: "evolution" },
  { id: "ca", source: "c", target: "a", type: "dependency" },
  { id: "bd", source: "b", target: "d", type: "related" },
  { id: "de", source: "d", target: "e", type: "related" },
];

const index = createGraphIndex(edges, ["orphan"]);

describe("traverseGraph", () => {
  it("returns only the selected node for direct traversal without a matching edge", () => {
    expect(traverseGraph(index, "orphan", "direct")).toEqual({ nodeIds: ["orphan"], edgeIds: [] });
  });

  it("finds immediate neighbours across directed and related edges in direct mode", () => {
    expect(traverseGraph(index, "b", "direct")).toEqual({
      nodeIds: ["a", "b", "c", "d"],
      edgeIds: ["ab", "bc", "bd"],
    });
  });

  it("traverses directed dependency and evolution edges upstream and downstream cycle-safely", () => {
    expect(traverseGraph(index, "b", "upstream")).toEqual({
      nodeIds: ["a", "b", "c"],
      edgeIds: ["ab", "bc", "ca"],
    });
    expect(traverseGraph(index, "b", "downstream")).toEqual({
      nodeIds: ["a", "b", "c"],
      edgeIds: ["ab", "bc", "ca"],
    });
  });

  it("combines directed reachability in both mode but keeps related edges separate", () => {
    expect(traverseGraph(index, "a", "both")).toEqual({
      nodeIds: ["a", "b", "c"],
      edgeIds: ["ab", "bc", "ca"],
    });
    expect(traverseGraph(index, "b", "related")).toEqual({
      nodeIds: ["b", "d", "e"],
      edgeIds: ["bd", "de"],
    });
  });

  it("returns an empty highlight for an unknown node", () => {
    expect(traverseGraph(index, "missing", "both")).toEqual({ nodeIds: [], edgeIds: [] });
  });
});
