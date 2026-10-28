export type TraversalMode = "direct" | "upstream" | "downstream" | "both" | "related";
export type TraversalEdgeType = "dependency" | "evolution" | "related";

export interface TraversalEdge {
  id: string;
  source: string;
  target: string;
  type: TraversalEdgeType;
}

export interface IndexedTraversal {
  readonly nodeIds: ReadonlySet<string>;
  readonly incoming: ReadonlyMap<string, readonly TraversalEdge[]>;
  readonly outgoing: ReadonlyMap<string, readonly TraversalEdge[]>;
  readonly related: ReadonlyMap<string, readonly TraversalEdge[]>;
  readonly incident: ReadonlyMap<string, readonly TraversalEdge[]>;
}

export interface TraversalResult {
  nodeIds: string[];
  edgeIds: string[];
}

const append = (map: Map<string, TraversalEdge[]>, nodeId: string, edge: TraversalEdge) => {
  const entries = map.get(nodeId);
  if (entries) entries.push(edge);
  else map.set(nodeId, [edge]);
};

export function createGraphIndex(edges: readonly TraversalEdge[], nodeIds: readonly string[] = []): IndexedTraversal {
  const nodes = new Set(nodeIds);
  const incoming = new Map<string, TraversalEdge[]>();
  const outgoing = new Map<string, TraversalEdge[]>();
  const related = new Map<string, TraversalEdge[]>();
  const incident = new Map<string, TraversalEdge[]>();

  for (const edge of [...edges].sort((left, right) => left.id.localeCompare(right.id))) {
    nodes.add(edge.source);
    nodes.add(edge.target);
    append(incident, edge.source, edge);
    if (edge.target !== edge.source) append(incident, edge.target, edge);

    if (edge.type === "related") {
      append(related, edge.source, edge);
      if (edge.target !== edge.source) append(related, edge.target, edge);
    } else {
      append(outgoing, edge.source, edge);
      append(incoming, edge.target, edge);
    }
  }

  return { nodeIds: nodes, incoming, outgoing, related, incident };
}

const sortedResult = (nodes: Set<string>, edges: Set<string>): TraversalResult => ({
  nodeIds: [...nodes].sort(),
  edgeIds: [...edges].sort(),
});

export function traverseGraph(index: IndexedTraversal, startNodeId: string, mode: TraversalMode): TraversalResult {
  if (!index.nodeIds.has(startNodeId)) return { nodeIds: [], edgeIds: [] };

  const nodeIds = new Set([startNodeId]);
  const edgeIds = new Set<string>();
  if (mode === "direct") {
    for (const edge of index.incident.get(startNodeId) ?? []) {
      edgeIds.add(edge.id);
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
    return sortedResult(nodeIds, edgeIds);
  }

  const visit = (
    adjacency: ReadonlyMap<string, readonly TraversalEdge[]>,
    nextNode: (edge: TraversalEdge, currentNodeId: string) => string,
  ) => {
    const queue = [startNodeId];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const currentNodeId = queue[cursor];
      for (const edge of adjacency.get(currentNodeId) ?? []) {
        edgeIds.add(edge.id);
        const next = nextNode(edge, currentNodeId);
        if (!nodeIds.has(next)) {
          nodeIds.add(next);
          queue.push(next);
        }
      }
    }
  };

  if (mode === "upstream" || mode === "both") visit(index.incoming, (edge) => edge.source);
  if (mode === "downstream" || mode === "both") visit(index.outgoing, (edge) => edge.target);
  if (mode === "related")
    visit(index.related, (edge, current) => (edge.source === current ? edge.target : edge.source));

  return sortedResult(nodeIds, edgeIds);
}
