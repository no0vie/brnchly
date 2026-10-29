import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { EvolutionBranch, EvolutionEdge, EvolutionNode, GraphBranch, GraphEdge, GraphNode } from "./index.js";

const assertPublicAliases = (
  node: GraphNode,
  edge: GraphEdge,
  branch: GraphBranch,
): [EvolutionNode, EvolutionEdge, EvolutionBranch] => [node, edge, branch];
void assertPublicAliases;

const sourceRoot = dirname(fileURLToPath(import.meta.url));

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });

describe("core package boundary", () => {
  it("does not import UI, browser storage, DOM globals, or application source", () => {
    const forbidden =
      /(?:from\s+["'](?:react|react-dom|antd|@ant-design\/|@\/|\.\.\/\.\.\/\.\.\/src)|\b(?:window|document|localStorage|HTMLElement|Element|DOMRect|ResizeObserver)\b)/;
    const violations = sourceFiles(sourceRoot)
      .filter((path) => !path.endsWith(".test.ts"))
      .flatMap((path) => {
        const lines = readFileSync(path, "utf8").split("\n");
        return lines.flatMap((line, index) =>
          forbidden.test(line) ? [`${relative(sourceRoot, path)}:${index + 1}: ${line.trim()}`] : [],
        );
      });

    expect(violations).toEqual([]);
  });

  it("exposes the curated public API from the package root", async () => {
    const api = await import("./index.js");

    expect(api).toMatchObject({
      CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION: 2,
      validateEvolutionGraph: expect.any(Function),
      migrateEvolutionGraph: expect.any(Function),
      serializeEvolutionGraph: expect.any(Function),
      parseEvolutionGraph: expect.any(Function),
      layoutGraph: expect.any(Function),
      calculateGraphLayout: expect.any(Function),
      createGraphIndex: expect.any(Function),
      traverseGraph: expect.any(Function),
      routeEdges: expect.any(Function),
      createPlaybackPlan: expect.any(Function),
      createViewport: expect.any(Function),
    });
    expect(api.calculateGraphLayout).toBe(api.layoutGraph);
  });
});
