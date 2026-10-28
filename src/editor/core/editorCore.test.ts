import { describe, expect, it } from "vitest";
import { serializeEvolutionGraph, type EvolutionGraph } from "../../domain/evolutionGraph";
import { applyGraphCommand, createGraphHistory, executeGraphCommand, redo, undo } from "./index";

const graph = (): EvolutionGraph => ({
  schemaVersion: 2,
  id: "g",
  title: "Graph",
  metadata: { owner: "old" },
  branches: [
    { id: "b1", title: "One", color: "red" },
    { id: "b2", title: "Two", color: "blue" },
  ],
  stages: [
    { id: "s1", title: "First", order: 0 },
    { id: "s2", title: "Second", order: 1 },
  ],
  lanes: [
    { id: "l1", title: "Top", coordinate: 0 },
    { id: "l2", title: "Bottom", coordinate: 1 },
  ],
  nodes: [
    { id: "n1", title: "One", branchId: "b1", status: "available", stageId: "s1", laneId: "l1" },
    { id: "n2", title: "Two", branchId: "b2", status: "locked", stageId: "s2", laneId: "l2" },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2", type: "dependency" }],
});

describe("applyGraphCommand", () => {
  it("updates and serializes graph title and description at the root without mutating identity or input", () => {
    const original = graph();
    const result = applyGraphCommand(original, {
      type: "update-graph",
      patch: {
        title: "Product evolution",
        description: "A product roadmap",
        id: "changed-at-runtime",
        schemaVersion: 1,
      } as { title: string; description: string },
    });

    expect(result.success).toBe(true);
    expect(result.graph).not.toBe(original);
    expect(result.graph).toMatchObject({
      schemaVersion: 2,
      id: "g",
      title: "Product evolution",
      description: "A product roadmap",
    });
    expect(original).not.toHaveProperty("description");
    expect(JSON.parse(serializeEvolutionGraph(result.graph))).toMatchObject({
      schemaVersion: 2,
      id: "g",
      title: "Product evolution",
      description: "A product roadmap",
    });
  });

  it("rejects invalid graph root updates and preserves the original graph", () => {
    const original = graph();
    const result = applyGraphCommand(original, { type: "update-graph", patch: { title: "" } });

    expect(result.success).toBe(false);
    expect(result.graph).toBe(original);
    expect(result.history).toBeUndefined();
    expect(result.validation.valid).toBe(false);
  });

  it("applies metadata and entity add/update/reorder commands without mutating input", () => {
    const original = graph();
    const result = applyGraphCommand(original, {
      type: "transaction",
      commands: [
        { type: "update-metadata", patch: { owner: "new" } },
        { type: "add-branch", branch: { id: "b3", title: "Three", color: "green" } },
        { type: "add-stage", stage: { id: "s3", title: "Third", order: 2 } },
        { type: "add-lane", lane: { id: "l3", title: "Last", coordinate: 2 } },
        { type: "update-node", id: "n1", patch: { title: "Updated" } },
        { type: "add-node", node: { id: "n3", title: "Three", branchId: "b3", status: "locked" } },
        { type: "add-edge", edge: { id: "e2", source: "n2", target: "n3", type: "related" } },
        { type: "update-stage", id: "s1", patch: { title: "Start" } },
        { type: "update-lane", id: "l1", patch: { title: "Primary" } },
        { type: "reorder-branches", ids: ["b3", "b1", "b2"] },
        { type: "reorder-nodes", ids: ["n3", "n2", "n1"] },
        { type: "reorder-edges", ids: ["e2", "e1"] },
        { type: "reorder-stages", ids: ["s3", "s2", "s1"] },
        { type: "reorder-lanes", ids: ["l3", "l2", "l1"] },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.graph).not.toBe(original);
    expect(result.graph.metadata?.owner).toBe("new");
    expect(result.graph.branches.map(({ id }) => id)).toEqual(["b3", "b1", "b2"]);
    expect(result.graph.nodes.map(({ id }) => id)).toEqual(["n3", "n2", "n1"]);
    expect(result.graph.stages?.map(({ id, order }) => [id, order])).toEqual([
      ["s3", 0],
      ["s2", 1],
      ["s1", 2],
    ]);
    expect(result.graph.lanes?.map(({ id, coordinate }) => [id, coordinate])).toEqual([
      ["l3", 0],
      ["l2", 1],
      ["l1", 2],
    ]);
    expect(result.history?.command.type).toBe("transaction");
    expect(original.nodes[0].title).toBe("One");
  });

  it("deletes a node and all incident edges atomically", () => {
    const result = applyGraphCommand(graph(), { type: "delete-node", id: "n1" });
    expect(result.success).toBe(true);
    expect(result.graph.nodes.map(({ id }) => id)).toEqual(["n2"]);
    expect(result.graph.edges).toEqual([]);
  });

  it("supports reject, reassign, and delete-nodes policies for referenced dimensions", () => {
    const original = graph();
    const rejected = applyGraphCommand(original, { type: "delete-stage", id: "s1", policy: { mode: "reject" } });
    expect(rejected.success).toBe(false);
    expect(rejected.graph).toBe(original);

    const reassigned = applyGraphCommand(original, {
      type: "delete-stage",
      id: "s1",
      policy: { mode: "reassign", targetId: "s2" },
    });
    expect(reassigned.success).toBe(true);
    expect(reassigned.graph.nodes.find(({ id }) => id === "n1")?.stageId).toBe("s2");

    const deleted = applyGraphCommand(original, { type: "delete-branch", id: "b1", policy: { mode: "delete-nodes" } });
    expect(deleted.success).toBe(true);
    expect(deleted.graph.nodes.map(({ id }) => id)).toEqual(["n2"]);
    expect(deleted.graph.edges).toEqual([]);
  });

  it("covers edge, branch, stage, and lane update/delete and metadata replacement", () => {
    const result = applyGraphCommand(graph(), {
      type: "batch",
      commands: [
        { type: "set-metadata", metadata: { release: 4 } },
        { type: "update-edge", id: "e1", patch: { type: "related" } },
        { type: "update-branch", id: "b1", patch: { color: "black" } },
        { type: "delete-edge", id: "e1" },
        { type: "delete-lane", id: "l1", policy: { mode: "reassign", targetId: "l2" } },
        { type: "delete-stage", id: "s1", policy: { mode: "delete-nodes" } },
        { type: "delete-branch", id: "b2", policy: { mode: "reassign", targetId: "b1" } },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.graph.metadata).toEqual({ release: 4 });
    expect(result.graph.nodes.map(({ id, branchId }) => [id, branchId])).toEqual([["n2", "b1"]]);
    expect(result.graph.edges).toEqual([]);
  });

  it("rejects invalid commands and dependency cycles with the original graph reference", () => {
    const original = graph();
    const missing = applyGraphCommand(original, { type: "delete-node", id: "missing" });
    expect(missing.success).toBe(false);
    expect(missing.graph).toBe(original);
    expect(missing.history).toBeUndefined();

    const cycle = applyGraphCommand(original, {
      type: "add-edge",
      edge: { id: "e2", source: "n2", target: "n1", type: "dependency" },
    });
    expect(cycle.success).toBe(false);
    expect(cycle.graph).toBe(original);
    expect(cycle.validation.issues).toContainEqual(expect.objectContaining({ code: "dependency_cycle" }));
  });

  it("rejects a transaction as one atomic operation when any nested command fails", () => {
    const original = graph();
    const result = applyGraphCommand(original, {
      type: "transaction",
      commands: [
        { type: "update-node", id: "n1", patch: { title: "Changed" } },
        { type: "delete-node", id: "missing" },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.graph).toBe(original);
    expect(original.nodes[0].title).toBe("One");
  });
});

describe("graph history", () => {
  it("undoes and redoes graph root title and description updates", () => {
    const original = graph();
    let history = executeGraphCommand(createGraphHistory(original), {
      type: "update-graph",
      patch: { title: "New title", description: "New description" },
    }).history;

    expect(history.graph).toMatchObject({ title: "New title", description: "New description" });
    history = undo(history).history;
    expect(history.graph).toBe(original);
    expect(history.graph.title).toBe("Graph");
    expect(history.graph.description).toBeUndefined();
    history = redo(history).history;
    expect(history.graph).toMatchObject({ title: "New title", description: "New description" });
  });

  it("undoes/redoes transactions as one operation and clears redo after a new command", () => {
    let history = createGraphHistory(graph());
    history = executeGraphCommand(history, {
      type: "transaction",
      commands: [
        { type: "update-node", id: "n1", patch: { title: "A" } },
        { type: "update-node", id: "n2", patch: { title: "B" } },
      ],
    }).history;
    expect(history.past).toHaveLength(1);
    history = undo(history).history;
    expect(history.graph.nodes[0].title).toBe("One");
    history = redo(history).history;
    expect(history.graph.nodes[0].title).toBe("A");
    history = undo(history).history;
    history = executeGraphCommand(history, { type: "update-node", id: "n1", patch: { title: "C" } }).history;
    expect(history.future).toEqual([]);
  });

  it("uses configurable bounded history and never records rejected commands", () => {
    let history = createGraphHistory(graph(), { depth: 2 });
    history = executeGraphCommand(history, { type: "update-node", id: "n1", patch: { title: "1" } }).history;
    history = executeGraphCommand(history, { type: "update-node", id: "n1", patch: { title: "2" } }).history;
    history = executeGraphCommand(history, { type: "update-node", id: "n1", patch: { title: "3" } }).history;
    expect(history.past).toHaveLength(2);
    const rejected = executeGraphCommand(history, { type: "delete-node", id: "missing" });
    expect(rejected.result.success).toBe(false);
    expect(rejected.history).toBe(history);
  });
});
