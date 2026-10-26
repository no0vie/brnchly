import { describe, expect, it } from "vitest";
import type { EvolutionGraph } from "../domain/evolutionGraph";
import { toClassicGraphData } from "./classicAdapter";

const graph: EvolutionGraph = {
  schemaVersion: 1,
  id: "graph",
  title: "Graph",
  branches: [{ id: "main", title: "Main", color: "#fff" }],
  nodes: [
    {
      id: "node",
      title: "Node",
      description: "Description",
      branchId: "main",
      status: "acquired",
      position: { x: 10, y: 20 },
      metadata: { legacyDifficulty: 7 },
    },
  ],
  edges: [],
  metadata: { legacyEvolutionSteps: [{ name: "Step", description: "Stage", offset: 100 }] },
};

describe("toClassicGraphData", () => {
  it("adapts the domain graph without mutating it", () => {
    const result = toClassicGraphData(graph);

    expect(result.items).toEqual([{ name: "Node", description: "Description", dif: 7, position: { x: 10, y: 20 } }]);
    expect(result.steps).toEqual([{ name: "Step", description: "Stage", offset: 100 }]);
    expect(result.items[0].position).not.toBe(graph.nodes[0].position);
  });
});
