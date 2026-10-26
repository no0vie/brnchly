import { describe, expect, it } from "vitest";
import type { EvolutionGraph } from "./types";
import { migrateEvolutionGraph } from "./migrations";
import { parseEvolutionGraph, serializeEvolutionGraph } from "./serialization";
import { validateEvolutionGraph } from "./validation";

const valid = (): EvolutionGraph => ({
  schemaVersion: 2,
  id: "g",
  title: "Graph",
  branches: [{ id: "b", title: "Branch", color: "#fff" }],
  stages: [{ id: "s", title: "Stage", order: 1 }],
  lanes: [{ id: "l", title: "Lane", coordinate: 10 }],
  nodes: [{ id: "n", title: "Node", branchId: "b", status: "available", stageId: "s", laneId: "l" }],
  edges: [],
});

describe("Evolution Graph schema v2", () => {
  it("validates every graph, branch, stage, lane, node, edge, and nested optional shape", () => {
    const malformed: unknown = {
      ...valid(),
      description: 4,
      metadata: [],
      branches: [{ id: "b", title: 3, color: "#fff" }],
      stages: [{ id: "s", title: "S", order: Number.NaN, description: 2 }],
      lanes: [{ id: "l", title: "L", coordinate: Infinity, color: 2 }],
      nodes: [{ id: "n", title: "N", branchId: "b", status: "available", position: { x: 1 }, evidence: [{}] }],
      edges: [{ id: "e", source: "n", target: "n", type: "related", extra: true }],
    };
    const result = validateEvolutionGraph(malformed);
    expect(result.valid).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "invalid_graph").length).toBeGreaterThanOrEqual(5);
  });

  it("rejects duplicate stage/lane IDs, stage orders, and lane coordinates explicitly", () => {
    const graph = valid();
    graph.stages!.push({ id: "s", title: "Other", order: 1 });
    graph.lanes!.push({ id: "l", title: "Other", coordinate: 10 });
    const codes = validateEvolutionGraph(graph).issues.map(({ code }) => code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "duplicate_stage_id",
        "duplicate_lane_id",
        "duplicate_stage_order",
        "duplicate_lane_coordinate",
      ]),
    );
  });

  it("requires stage and lane references as a valid pair", () => {
    const missingPair = valid();
    delete missingPair.nodes[0].laneId;
    expect(validateEvolutionGraph(missingPair).issues).toContainEqual(
      expect.objectContaining({ code: "incomplete_stage_lane" }),
    );

    const unknown = valid();
    unknown.nodes[0].stageId = "missing-stage";
    unknown.nodes[0].laneId = "missing-lane";
    expect(validateEvolutionGraph(unknown).issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["unknown_stage", "unknown_lane"]),
    );
  });

  it("migrates v1 without changing its graph content and remains JSON compatible", () => {
    const v1 = {
      schemaVersion: 1,
      id: "v1",
      title: "Old",
      description: "kept",
      branches: [{ id: "b", title: "B", color: "#fff" }],
      nodes: [{ id: "n", title: "N", branchId: "b", status: "available" }],
      edges: [],
      metadata: { custom: true },
    };
    const migrated = migrateEvolutionGraph(v1);
    expect(migrated).toEqual({ ...v1, schemaVersion: 2 });
    expect(parseEvolutionGraph(JSON.stringify(v1))).toEqual(migrated);
    expect(parseEvolutionGraph(serializeEvolutionGraph(v1 as EvolutionGraph))).toEqual(migrated);
  });

  it("migrates schema v0 directly to v2", () => {
    expect(migrateEvolutionGraph({ schemaVersion: 0, nodes: [], edges: [] }).schemaVersion).toBe(2);
  });
});
