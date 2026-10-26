import type { EvolutionStep, GraphItem } from "../../types";
import {
  CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION,
  type EvolutionGraph,
  type EvolutionGraphV2,
  type EvolutionNode,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stableId = (value: string, fallback: string): string => {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
};

const uniqueIds = (titles: string[], prefix: string): string[] => {
  const counts = new Map<string, number>();
  return titles.map((title, index) => {
    const base = stableId(title, `${prefix}-${index + 1}`);
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
};

export const migrateLegacyEvolutionData = (
  items: GraphItem[],
  steps: EvolutionStep[],
  options: { id?: string; title?: string } = {},
): EvolutionGraphV2 => {
  const nodeIds = uniqueIds(
    items.map((item) => item.name),
    "node",
  );
  const nodes: EvolutionNode[] = items.map((item, index) => ({
    id: nodeIds[index],
    title: item.name,
    description: item.description,
    branchId: "legacy-main",
    status: item.dif >= 8 ? "mastered" : item.dif > 0 ? "acquired" : "available",
    ...(item.position ? { position: { ...item.position } } : {}),
    metadata: { legacyDifficulty: item.dif },
  }));

  return {
    schemaVersion: CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION,
    id: options.id ?? "legacy-evolution-graph",
    title: options.title ?? "Evolution Graph",
    branches: [{ id: "legacy-main", title: "Evolution", color: "#13c2c2" }],
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      id: `evolution-${nodeIds[index]}-${node.id}`,
      source: nodeIds[index],
      target: node.id,
      type: "evolution" as const,
    })),
    metadata: { legacyEvolutionSteps: steps.map((step) => ({ ...step })) },
  };
};

export const migrateEvolutionGraph = (input: unknown): EvolutionGraphV2 => {
  if (!isRecord(input)) throw new Error("Evolution Graph payload must be an object.");
  const version = input.schemaVersion;
  if (typeof version !== "number") throw new Error("Evolution Graph schemaVersion is required.");
  if (version > CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION) {
    throw new Error(`Cannot import a newer schema version (${version}).`);
  }
  if (version < 0) throw new Error(`Unsupported Evolution Graph schema version (${version}).`);

  if (version === CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION) return input as unknown as EvolutionGraphV2;

  if (version === 1) {
    return {
      ...(input as unknown as EvolutionGraph),
      schemaVersion: CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION,
    } as EvolutionGraphV2;
  }

  if (version === 0) {
    const rawNodes = Array.isArray(input.nodes) ? input.nodes : [];
    return {
      schemaVersion: CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION,
      id: typeof input.id === "string" ? input.id : "migrated-graph",
      title: typeof input.title === "string" ? input.title : "Migrated Evolution Graph",
      branches: [{ id: "main", title: "Main", color: "#7c8cff" }],
      nodes: rawNodes.filter(isRecord).map((node, index) => ({
        id: typeof node.id === "string" ? node.id : `node-${index + 1}`,
        title: typeof node.title === "string" ? node.title : `Node ${index + 1}`,
        ...(typeof node.description === "string" ? { description: node.description } : {}),
        branchId: "main",
        status: "available",
      })),
      edges: Array.isArray(input.edges) ? (input.edges as EvolutionGraph["edges"]) : [],
    };
  }

  throw new Error(`Unsupported Evolution Graph schema version (${version}).`);
};
