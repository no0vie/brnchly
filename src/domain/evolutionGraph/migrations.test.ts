import { describe, expect, it } from "vitest";
import type { EvolutionStep, GraphItem } from "../../types";
import { CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION } from "./types";
import { migrateEvolutionGraph, migrateLegacyEvolutionData } from "./migrations";

const legacyItems: GraphItem[] = [
  { name: "HTML / CSS", dif: -2, description: "Web foundations", position: { x: 50, y: 80 } },
  { name: "React", dif: 4, description: "UI components" },
];
const legacySteps: EvolutionStep[] = [
  { name: "Foundation", description: "Starting point", offset: 0 },
  { name: "Frameworks", description: "Component era", offset: 500 },
];

describe("Evolution Graph migrations", () => {
  it("deterministically migrates existing items and steps without losing content", () => {
    const first = migrateLegacyEvolutionData(legacyItems, legacySteps);
    const second = migrateLegacyEvolutionData(legacyItems, legacySteps);

    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe(CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION);
    expect(first.nodes.map((node) => node.title)).toEqual(["HTML / CSS", "React"]);
    expect(first.nodes[0].position).toEqual({ x: 50, y: 80 });
    expect(first.edges).toHaveLength(1);
    expect(first.metadata?.legacyEvolutionSteps).toEqual(legacySteps);
  });

  it("migrates schema v0 defaults to the current schema", () => {
    const migrated = migrateEvolutionGraph({
      schemaVersion: 0,
      id: "old",
      title: "Old graph",
      nodes: [{ id: "node", title: "Node" }],
      edges: [],
    });

    expect(migrated).toEqual(
      expect.objectContaining({
        schemaVersion: CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION,
        branches: [{ id: "main", title: "Main", color: "#7c8cff" }],
      }),
    );
    expect(migrated.nodes[0]).toEqual(expect.objectContaining({ branchId: "main", status: "available" }));
  });

  it("rejects unsupported future schemas", () => {
    expect(() => migrateEvolutionGraph({ schemaVersion: 999 })).toThrow("newer schema version");
  });
});
