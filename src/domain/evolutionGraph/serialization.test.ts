import { describe, expect, it } from "vitest";
import type { EvolutionGraph } from "./types";
import { EvolutionGraphImportError, parseEvolutionGraph, serializeEvolutionGraph } from "./serialization";

const graph: EvolutionGraph = {
  schemaVersion: 2,
  id: "serialization-demo",
  title: "Serialization demo",
  branches: [{ id: "main", title: "Main", color: "#ffffff" }],
  nodes: [{ id: "first", title: "First", branchId: "main", status: "acquired" }],
  edges: [],
};

describe("EvolutionGraph JSON serialization", () => {
  it("round-trips a valid graph", () => {
    expect(parseEvolutionGraph(serializeEvolutionGraph(graph))).toEqual(graph);
  });

  it("returns an actionable import error for malformed JSON", () => {
    expect(() => parseEvolutionGraph("{ invalid")).toThrow(EvolutionGraphImportError);
    expect(() => parseEvolutionGraph("{ invalid")).toThrow("valid JSON");
  });

  it("rejects structurally invalid graph JSON", () => {
    expect(() => parseEvolutionGraph(JSON.stringify({ schemaVersion: 2 }))).toThrow("invalid Evolution Graph");
  });
});
