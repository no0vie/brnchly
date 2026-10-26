import { describe, expect, it } from "vitest";
import type { EvolutionGraph } from "./types";
import { validateEvolutionGraph } from "./validation";

const validGraph = (): EvolutionGraph => ({
  schemaVersion: 2,
  id: "graph-1",
  title: "Test graph",
  branches: [
    { id: "frontend", title: "Frontend", color: "#61dafb" },
    { id: "backend", title: "Backend", color: "#68a063" },
  ],
  nodes: [
    { id: "html", title: "HTML", branchId: "frontend", status: "mastered" },
    { id: "react", title: "React", branchId: "frontend", status: "available" },
    { id: "api", title: "API Design", branchId: "backend", status: "locked" },
  ],
  edges: [
    { id: "html-react", source: "html", target: "react", type: "dependency" },
    { id: "react-api", source: "react", target: "api", type: "dependency" },
  ],
});

describe("validateEvolutionGraph", () => {
  it("accepts a valid graph with cross-branch dependencies", () => {
    const result = validateEvolutionGraph(validGraph());

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("reports duplicate stable identifiers and broken references", () => {
    const graph = validGraph();
    graph.nodes.push({ ...graph.nodes[0], branchId: "missing-branch" });
    graph.edges.push({ id: "broken", source: "missing-node", target: "html", type: "related" });

    const result = validateEvolutionGraph(graph);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["duplicate_node_id", "unknown_branch", "unknown_source_node"]),
    );
  });

  it("rejects cycles formed only by dependency edges", () => {
    const graph = validGraph();
    graph.edges.push({ id: "api-html", source: "api", target: "html", type: "dependency" });

    const result = validateEvolutionGraph(graph);

    expect(result.issues).toContainEqual(expect.objectContaining({ code: "dependency_cycle" }));
  });

  it("allows cycles made from non-dependency edges", () => {
    const graph = validGraph();
    graph.edges.push({ id: "api-html-related", source: "api", target: "html", type: "related" });

    expect(validateEvolutionGraph(graph).valid).toBe(true);
  });

  it("rejects enum values outside the public contract at runtime", () => {
    const graph = validGraph() as unknown as {
      nodes: Array<Record<string, unknown>>;
      edges: Array<Record<string, unknown>>;
    };
    graph.nodes[0].status = "unknown";
    graph.edges[0].type = "blocks";

    const result = validateEvolutionGraph(graph);

    expect(result.valid).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "invalid_graph")).toHaveLength(2);
  });
});
