import type { EvolutionGraph, EvolutionLayoutStrategy, Position } from "../domain/evolutionGraph";

export interface Size {
  width: number;
  height: number;
}
export interface Bounds extends Position, Size {}
export interface LayoutRegion extends Bounds {
  id: string;
  kind: "stage" | "lane";
}
export interface LayoutOptions {
  strategy: EvolutionLayoutStrategy;
  nodeSize?: Size;
  nodeGap?: number;
  layerGap?: number;
  headerSize?: number;
}
export interface LayoutResult {
  positions: Record<string, Position>;
  bounds: Bounds;
  nodeSize: Size;
  regions: LayoutRegion[];
}

const DEFAULT_NODE_SIZE: Size = { width: 160, height: 72 };
const empty = (nodeSize: Size): LayoutResult => ({
  positions: {},
  bounds: { x: 0, y: 0, width: 0, height: 0 },
  nodeSize,
  regions: [],
});
const sortedNodes = (graph: EvolutionGraph) => [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));

const resultBounds = (positions: Record<string, Position>, nodeSize: Size, regions: LayoutRegion[] = []): Bounds => {
  const boxes: Bounds[] = [...Object.values(positions).map(({ x, y }) => ({ x, y, ...nodeSize })), ...regions];
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
};

const dagLayers = (graph: EvolutionGraph): Map<string, number> => {
  const nodes = sortedNodes(graph);
  const ids = new Set(nodes.map(({ id }) => id));
  const incoming = new Map(nodes.map(({ id }) => [id, new Set<string>()]));
  const outgoing = new Map(nodes.map(({ id }) => [id, new Set<string>()]));
  graph.edges
    .filter(({ type, source, target }) => type !== "related" && ids.has(source) && ids.has(target) && source !== target)
    .forEach(({ source, target }) => {
      incoming.get(target)!.add(source);
      outgoing.get(source)!.add(target);
    });
  const layers = new Map<string, number>();
  const pending = new Set(nodes.map(({ id }) => id));
  while (pending.size > 0) {
    const ready = [...pending].filter((id) => [...incoming.get(id)!].every((source) => !pending.has(source))).sort();
    if (ready.length === 0) {
      // Remaining nodes contain cycles. Place them as one deterministic layer after resolved predecessors.
      const cycleLayer = Math.max(
        0,
        ...[...pending].flatMap((id) =>
          [...incoming.get(id)!].filter((source) => layers.has(source)).map((source) => layers.get(source)! + 1),
        ),
      );
      [...pending].sort().forEach((id) => layers.set(id, cycleLayer));
      break;
    }
    ready.forEach((id) => {
      const parents = [...incoming.get(id)!].filter((source) => layers.has(source));
      layers.set(id, parents.length === 0 ? 0 : Math.max(...parents.map((source) => layers.get(source)! + 1)));
      pending.delete(id);
    });
  }
  return layers;
};

const layoutDag = (
  graph: EvolutionGraph,
  vertical: boolean,
  nodeSize: Size,
  gap: number,
  layerGap: number,
): Record<string, Position> => {
  const layers = dagLayers(graph);
  const groups = new Map<number, string[]>();
  sortedNodes(graph).forEach(({ id }) => {
    const layer = layers.get(id) ?? 0;
    groups.set(layer, [...(groups.get(layer) ?? []), id]);
  });
  const positions: Record<string, Position> = {};
  [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([layer, ids]) =>
      ids.forEach((id, index) => {
        positions[id] = vertical
          ? { x: index * (nodeSize.width + gap), y: layer * (nodeSize.height + layerGap) }
          : { x: layer * (nodeSize.width + layerGap), y: index * (nodeSize.height + gap) };
      }),
    );
  return positions;
};

const layoutRadial = (graph: EvolutionGraph, nodeSize: Size, gap: number): Record<string, Position> => {
  const nodes = sortedNodes(graph);
  if (nodes.length === 1) return { [nodes[0].id]: { x: 0, y: 0 } };
  const radius = Math.max(nodeSize.width, nodeSize.height) * Math.max(1, nodes.length / (2 * Math.PI)) + gap;
  return Object.fromEntries(
    nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
      return [
        node.id,
        {
          x: Math.round(Math.cos(angle) * radius * 1000) / 1000,
          y: Math.round(Math.sin(angle) * radius * 1000) / 1000,
        },
      ];
    }),
  );
};

const layoutStageLane = (
  graph: EvolutionGraph,
  nodeSize: Size,
  gap: number,
  header: number,
): Pick<LayoutResult, "positions" | "regions"> => {
  const stages = [...(graph.stages ?? [])].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const lanes = [...(graph.lanes ?? [])].sort((a, b) => a.coordinate - b.coordinate || a.id.localeCompare(b.id));
  const cells = new Map<string, string[]>();
  sortedNodes(graph).forEach((node) => {
    if (!node.stageId || !node.laneId) return;
    const key = `${node.stageId}\0${node.laneId}`;
    cells.set(key, [...(cells.get(key) ?? []), node.id]);
  });
  const stageColumns = new Map(
    stages.map((stage) => [
      stage.id,
      Math.max(1, ...lanes.map((lane) => Math.ceil(Math.sqrt(cells.get(`${stage.id}\0${lane.id}`)?.length ?? 0)))),
    ]),
  );
  const laneRows = new Map(
    lanes.map((lane) => [
      lane.id,
      Math.max(
        1,
        ...stages.map((stage) => {
          const count = cells.get(`${stage.id}\0${lane.id}`)?.length ?? 0;
          return Math.ceil(count / stageColumns.get(stage.id)!);
        }),
      ),
    ]),
  );
  const stageWidths = new Map(
    stages.map((stage) => [
      stage.id,
      stageColumns.get(stage.id)! * nodeSize.width + (stageColumns.get(stage.id)! + 1) * gap,
    ]),
  );
  const laneHeights = new Map(
    lanes.map((lane) => [lane.id, laneRows.get(lane.id)! * nodeSize.height + (laneRows.get(lane.id)! + 1) * gap]),
  );
  const stageX = new Map<string, number>();
  let x = header;
  stages.forEach((stage) => {
    stageX.set(stage.id, x);
    x += stageWidths.get(stage.id)!;
  });
  const laneY = new Map<string, number>();
  let y = header;
  lanes.forEach((lane) => {
    laneY.set(lane.id, y);
    y += laneHeights.get(lane.id)!;
  });
  const positions: Record<string, Position> = {};
  stages.forEach((stage) =>
    lanes.forEach((lane) => {
      const columns = stageColumns.get(stage.id)!;
      (cells.get(`${stage.id}\0${lane.id}`) ?? []).forEach((id, index) => {
        positions[id] = {
          x: stageX.get(stage.id)! + gap + (index % columns) * (nodeSize.width + gap),
          y: laneY.get(lane.id)! + gap + Math.floor(index / columns) * (nodeSize.height + gap),
        };
      });
    }),
  );
  // Nodes without a valid cell remain visible below the grid.
  sortedNodes(graph)
    .filter(({ id }) => !positions[id])
    .forEach(({ id }, index) => {
      positions[id] = { x: header + index * (nodeSize.width + gap), y: y + gap };
    });
  const totalHeight = y - header;
  const totalWidth = x - header;
  const regions: LayoutRegion[] = [
    ...stages.map((stage) => ({
      id: stage.id,
      kind: "stage" as const,
      x: stageX.get(stage.id)!,
      y: 0,
      width: stageWidths.get(stage.id)!,
      height: header + totalHeight,
    })),
    ...lanes.map((lane) => ({
      id: lane.id,
      kind: "lane" as const,
      x: 0,
      y: laneY.get(lane.id)!,
      width: header + totalWidth,
      height: laneHeights.get(lane.id)!,
    })),
  ];
  return { positions, regions };
};

export const layoutGraph = (graph: EvolutionGraph, options: LayoutOptions): LayoutResult => {
  const nodeSize = options.nodeSize ?? DEFAULT_NODE_SIZE;
  if (graph.nodes.length === 0) return empty(nodeSize);
  const gap = options.nodeGap ?? 32;
  const layerGap = options.layerGap ?? 96;
  let positions: Record<string, Position>;
  let regions: LayoutRegion[] = [];
  switch (options.strategy) {
    case "vertical-dag":
      positions = layoutDag(graph, true, nodeSize, gap, layerGap);
      break;
    case "horizontal-dag":
      positions = layoutDag(graph, false, nodeSize, gap, layerGap);
      break;
    case "radial":
    case "radial-tree":
      positions = layoutRadial(graph, nodeSize, gap);
      break;
    case "manual": {
      let fallbackIndex = 0;
      positions = Object.fromEntries(
        sortedNodes(graph).map((node) => {
          if (node.position) return [node.id, { ...node.position }];
          const position = { x: fallbackIndex * (nodeSize.width + gap), y: 0 };
          fallbackIndex += 1;
          return [node.id, position];
        }),
      );
      break;
    }
    case "stage-lane":
      ({ positions, regions } = layoutStageLane(graph, nodeSize, gap, options.headerSize ?? 48));
      break;
  }
  return { positions, bounds: resultBounds(positions, nodeSize, regions), nodeSize, regions };
};
