import { CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION, type EvolutionGraph } from "./types";

export type EvolutionGraphValidationCode =
  | "invalid_graph"
  | "unsupported_schema_version"
  | "duplicate_branch_id"
  | "duplicate_stage_id"
  | "duplicate_lane_id"
  | "duplicate_node_id"
  | "duplicate_edge_id"
  | "duplicate_stage_order"
  | "duplicate_lane_coordinate"
  | "unknown_branch"
  | "unknown_stage"
  | "unknown_lane"
  | "incomplete_stage_lane"
  | "unknown_source_node"
  | "unknown_target_node"
  | "self_dependency"
  | "dependency_cycle";

export interface EvolutionGraphValidationIssue {
  code: EvolutionGraphValidationCode;
  message: string;
  path?: string;
}
export interface EvolutionGraphValidationResult {
  valid: boolean;
  issues: EvolutionGraphValidationIssue[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const optionalString = (value: unknown): boolean => value === undefined || typeof value === "string";
const finiteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const statuses = new Set(["locked", "available", "acquired", "mastered"]);
const edgeTypes = new Set(["dependency", "evolution", "related"]);

const duplicateProperty = (
  items: unknown[],
  property: string,
  code: EvolutionGraphValidationCode,
  collection: string,
): EvolutionGraphValidationIssue[] => {
  const seen = new Set<unknown>();
  const issues: EvolutionGraphValidationIssue[] = [];
  items.forEach((item, index) => {
    if (!isRecord(item)) return;
    const value = item[property];
    if ((typeof value !== "string" || value.length === 0) && !finiteNumber(value)) return;
    if (seen.has(value))
      issues.push({
        code,
        message: `Duplicate ${collection} ${property} "${String(value)}".`,
        path: `${collection}[${index}].${property}`,
      });
    seen.add(value);
  });
  return issues;
};

const validPosition = (value: unknown) =>
  value === undefined || (isRecord(value) && finiteNumber(value.x) && finiteNumber(value.y));
const validEvidence = (value: unknown) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every(
      (item) => isRecord(item) && nonEmpty(item.title) && optionalString(item.description) && optionalString(item.url),
    ));

const findDependencyCycle = (graph: EvolutionGraph): string[] | undefined => {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, [] as string[]]));
  graph.edges.forEach((edge) => {
    if (edge.type === "dependency" && adjacency.has(edge.source) && adjacency.has(edge.target))
      adjacency.get(edge.source)!.push(edge.target);
  });
  adjacency.forEach((targets) => targets.sort());
  const state = new Map<string, number>();
  const path: string[] = [];
  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === 1) return [...path.slice(path.indexOf(id)), id];
    if (state.get(id) === 2) return undefined;
    state.set(id, 1);
    path.push(id);
    for (const target of adjacency.get(id) ?? []) {
      const cycle = visit(target);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(id, 2);
    return undefined;
  };
  for (const id of [...adjacency.keys()].sort()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
};

export const validateEvolutionGraph = (value: unknown): EvolutionGraphValidationResult => {
  if (!isRecord(value))
    return { valid: false, issues: [{ code: "invalid_graph", message: "Graph must be an object." }] };
  const issues: EvolutionGraphValidationIssue[] = [];
  const branches = Array.isArray(value.branches) ? value.branches : [];
  const stages = Array.isArray(value.stages) ? value.stages : [];
  const lanes = Array.isArray(value.lanes) ? value.lanes : [];
  const nodes = Array.isArray(value.nodes) ? value.nodes : [];
  const edges = Array.isArray(value.edges) ? value.edges : [];

  if (value.schemaVersion !== CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION)
    issues.push({
      code: "unsupported_schema_version",
      message: `Expected schema version ${CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION}.`,
      path: "schemaVersion",
    });
  if (
    !nonEmpty(value.id) ||
    !nonEmpty(value.title) ||
    !optionalString(value.description) ||
    !Array.isArray(value.branches) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    (value.stages !== undefined && !Array.isArray(value.stages)) ||
    (value.lanes !== undefined && !Array.isArray(value.lanes)) ||
    (value.metadata !== undefined && !isRecord(value.metadata))
  ) {
    issues.push({ code: "invalid_graph", message: "Graph header or collections are invalid." });
  }

  issues.push(
    ...duplicateProperty(branches, "id", "duplicate_branch_id", "branches"),
    ...duplicateProperty(stages, "id", "duplicate_stage_id", "stages"),
    ...duplicateProperty(lanes, "id", "duplicate_lane_id", "lanes"),
    ...duplicateProperty(nodes, "id", "duplicate_node_id", "nodes"),
    ...duplicateProperty(edges, "id", "duplicate_edge_id", "edges"),
    ...duplicateProperty(stages, "order", "duplicate_stage_order", "stages"),
    ...duplicateProperty(lanes, "coordinate", "duplicate_lane_coordinate", "lanes"),
  );

  branches.forEach((item, index) => {
    if (
      !isRecord(item) ||
      !nonEmpty(item.id) ||
      !nonEmpty(item.title) ||
      !nonEmpty(item.color) ||
      !optionalString(item.description)
    )
      issues.push({ code: "invalid_graph", message: "Branch shape is invalid.", path: `branches[${index}]` });
  });
  stages.forEach((item, index) => {
    if (
      !isRecord(item) ||
      !nonEmpty(item.id) ||
      !nonEmpty(item.title) ||
      !finiteNumber(item.order) ||
      !optionalString(item.description)
    )
      issues.push({ code: "invalid_graph", message: "Stage shape is invalid.", path: `stages[${index}]` });
  });
  lanes.forEach((item, index) => {
    if (
      !isRecord(item) ||
      !nonEmpty(item.id) ||
      !nonEmpty(item.title) ||
      !finiteNumber(item.coordinate) ||
      !optionalString(item.color)
    )
      issues.push({ code: "invalid_graph", message: "Lane shape is invalid.", path: `lanes[${index}]` });
  });

  const branchIds = new Set(
    branches
      .filter(isRecord)
      .map((x) => x.id)
      .filter(nonEmpty),
  );
  const stageIds = new Set(
    stages
      .filter(isRecord)
      .map((x) => x.id)
      .filter(nonEmpty),
  );
  const laneIds = new Set(
    lanes
      .filter(isRecord)
      .map((x) => x.id)
      .filter(nonEmpty),
  );
  const nodeIds = new Set(
    nodes
      .filter(isRecord)
      .map((x) => x.id)
      .filter(nonEmpty),
  );
  nodes.forEach((item, index) => {
    if (
      !isRecord(item) ||
      !nonEmpty(item.id) ||
      !nonEmpty(item.title) ||
      !nonEmpty(item.branchId) ||
      !nonEmpty(item.status) ||
      !statuses.has(item.status) ||
      !optionalString(item.description) ||
      !optionalString(item.icon) ||
      (item.level !== undefined && !finiteNumber(item.level)) ||
      !optionalString(item.acquiredAt) ||
      !validEvidence(item.evidence) ||
      !validPosition(item.position) ||
      (item.metadata !== undefined && !isRecord(item.metadata)) ||
      !optionalString(item.stageId) ||
      !optionalString(item.laneId)
    ) {
      issues.push({ code: "invalid_graph", message: "Node shape is invalid.", path: `nodes[${index}]` });
      return;
    }
    if (!branchIds.has(item.branchId))
      issues.push({
        code: "unknown_branch",
        message: `Node "${item.id}" references unknown branch "${item.branchId}".`,
        path: `nodes[${index}].branchId`,
      });
    if ((item.stageId === undefined) !== (item.laneId === undefined))
      issues.push({
        code: "incomplete_stage_lane",
        message: "stageId and laneId must be supplied together.",
        path: `nodes[${index}]`,
      });
    if (typeof item.stageId === "string" && !stageIds.has(item.stageId))
      issues.push({
        code: "unknown_stage",
        message: `Unknown stage "${item.stageId}".`,
        path: `nodes[${index}].stageId`,
      });
    if (typeof item.laneId === "string" && !laneIds.has(item.laneId))
      issues.push({ code: "unknown_lane", message: `Unknown lane "${item.laneId}".`, path: `nodes[${index}].laneId` });
  });
  edges.forEach((item, index) => {
    if (
      !isRecord(item) ||
      !nonEmpty(item.id) ||
      !nonEmpty(item.source) ||
      !nonEmpty(item.target) ||
      !nonEmpty(item.type) ||
      !edgeTypes.has(item.type)
    ) {
      issues.push({ code: "invalid_graph", message: "Edge shape is invalid.", path: `edges[${index}]` });
      return;
    }
    if (!nodeIds.has(item.source))
      issues.push({
        code: "unknown_source_node",
        message: `Unknown source "${item.source}".`,
        path: `edges[${index}].source`,
      });
    if (!nodeIds.has(item.target))
      issues.push({
        code: "unknown_target_node",
        message: `Unknown target "${item.target}".`,
        path: `edges[${index}].target`,
      });
    if (item.type === "dependency" && item.source === item.target)
      issues.push({
        code: "self_dependency",
        message: `Dependency "${item.id}" cannot reference the same node.`,
        path: `edges[${index}]`,
      });
  });
  if (Array.isArray(value.nodes) && Array.isArray(value.edges) && nodes.every(isRecord) && edges.every(isRecord)) {
    const cycle = findDependencyCycle(value as unknown as EvolutionGraph);
    if (cycle) issues.push({ code: "dependency_cycle", message: `Dependency cycle detected: ${cycle.join(" -> ")}.` });
  }
  return { valid: issues.length === 0, issues };
};
