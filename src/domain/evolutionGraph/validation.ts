import { CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION, type EvolutionGraph } from './types';

export type EvolutionGraphValidationCode =
  | 'invalid_graph'
  | 'unsupported_schema_version'
  | 'duplicate_branch_id'
  | 'duplicate_node_id'
  | 'duplicate_edge_id'
  | 'unknown_branch'
  | 'unknown_source_node'
  | 'unknown_target_node'
  | 'self_dependency'
  | 'dependency_cycle';

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
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nodeStatuses = new Set(['locked', 'available', 'acquired', 'mastered']);
const edgeTypes = new Set(['dependency', 'evolution', 'related']);

const duplicateIds = (items: unknown[], code: EvolutionGraphValidationCode, collection: string): EvolutionGraphValidationIssue[] => {
  const seen = new Set<string>();
  const issues: EvolutionGraphValidationIssue[] = [];
  items.forEach((item, index) => {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id.length === 0) return;
    if (seen.has(item.id)) {
      issues.push({ code, message: `Duplicate ${collection} id "${item.id}".`, path: `${collection}[${index}].id` });
    }
    seen.add(item.id);
  });
  return issues;
};

const findDependencyCycle = (graph: EvolutionGraph): string[] | undefined => {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, [] as string[]]));
  graph.edges.forEach((edge) => {
    if (edge.type === 'dependency' && adjacency.has(edge.source) && adjacency.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
    }
  });
  adjacency.forEach((targets) => targets.sort());

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  const visit = (nodeId: string): string[] | undefined => {
    if (visiting.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return [...path.slice(cycleStart), nodeId];
    }
    if (visited.has(nodeId)) return undefined;

    visiting.add(nodeId);
    path.push(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) {
      const cycle = visit(target);
      if (cycle) return cycle;
    }
    path.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return undefined;
  };

  for (const nodeId of [...adjacency.keys()].sort()) {
    const cycle = visit(nodeId);
    if (cycle) return cycle;
  }
  return undefined;
};

export const validateEvolutionGraph = (value: unknown): EvolutionGraphValidationResult => {
  if (!isRecord(value)) {
    return { valid: false, issues: [{ code: 'invalid_graph', message: 'Graph must be an object.' }] };
  }

  const branches = Array.isArray(value.branches) ? value.branches : [];
  const nodes = Array.isArray(value.nodes) ? value.nodes : [];
  const edges = Array.isArray(value.edges) ? value.edges : [];
  const issues: EvolutionGraphValidationIssue[] = [];

  if (
    value.schemaVersion !== CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION ||
    typeof value.id !== 'string' || value.id.length === 0 ||
    typeof value.title !== 'string' || value.title.length === 0 ||
    !Array.isArray(value.branches) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)
  ) {
    issues.push({
      code: value.schemaVersion === CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION ? 'invalid_graph' : 'unsupported_schema_version',
      message: 'Graph header or collections are invalid.',
    });
  }

  issues.push(...duplicateIds(branches, 'duplicate_branch_id', 'branches'));
  issues.push(...duplicateIds(nodes, 'duplicate_node_id', 'nodes'));
  issues.push(...duplicateIds(edges, 'duplicate_edge_id', 'edges'));

  const branchIds = new Set(branches.filter(isRecord).map((branch) => branch.id).filter((id): id is string => typeof id === 'string'));
  const nodeIds = new Set(nodes.filter(isRecord).map((node) => node.id).filter((id): id is string => typeof id === 'string'));

  nodes.forEach((node, index) => {
    if (!isRecord(node) || typeof node.id !== 'string' || typeof node.title !== 'string' || typeof node.branchId !== 'string' || typeof node.status !== 'string' || !nodeStatuses.has(node.status)) {
      issues.push({ code: 'invalid_graph', message: 'Node shape is invalid.', path: `nodes[${index}]` });
      return;
    }
    if (!branchIds.has(node.branchId)) {
      issues.push({ code: 'unknown_branch', message: `Node "${node.id}" references unknown branch "${node.branchId}".`, path: `nodes[${index}].branchId` });
    }
  });

  edges.forEach((edge, index) => {
    if (!isRecord(edge) || typeof edge.id !== 'string' || typeof edge.source !== 'string' || typeof edge.target !== 'string' || typeof edge.type !== 'string' || !edgeTypes.has(edge.type)) {
      issues.push({ code: 'invalid_graph', message: 'Edge shape is invalid.', path: `edges[${index}]` });
      return;
    }
    if (!nodeIds.has(edge.source)) issues.push({ code: 'unknown_source_node', message: `Edge "${edge.id}" has unknown source "${edge.source}".`, path: `edges[${index}].source` });
    if (!nodeIds.has(edge.target)) issues.push({ code: 'unknown_target_node', message: `Edge "${edge.id}" has unknown target "${edge.target}".`, path: `edges[${index}].target` });
    if (edge.type === 'dependency' && edge.source === edge.target) issues.push({ code: 'self_dependency', message: `Dependency "${edge.id}" cannot reference the same node.`, path: `edges[${index}]` });
  });

  if (issues.every((issue) => issue.code !== 'invalid_graph') && Array.isArray(value.nodes) && Array.isArray(value.edges)) {
    const cycle = findDependencyCycle(value as unknown as EvolutionGraph);
    if (cycle) issues.push({ code: 'dependency_cycle', message: `Dependency cycle detected: ${cycle.join(' -> ')}.` });
  }

  return { valid: issues.length === 0, issues };
};
