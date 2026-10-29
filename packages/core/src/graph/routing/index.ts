export interface Point {
  x: number;
  y: number;
}

export interface NodeSize {
  width: number;
  height: number;
}

export type RoutingOrientation = "horizontal" | "vertical";

export interface RoutableEdge {
  id: string;
  source: string;
  target: string;
}

export interface EdgeRoute extends RoutableEdge {
  sourcePoint: Point;
  targetPoint: Point;
  path: string;
}

type Side = "left" | "right" | "top" | "bottom";
type LocatedEdge = RoutableEdge & { sourcePosition: Point; targetPosition: Point; sourceSide: Side; targetSide: Side };

const number = (value: number) => Number(value.toFixed(3));
const pointText = ({ x, y }: Point) => `${number(x)} ${number(y)}`;
const sideKey = (nodeId: string, side: Side) => `${nodeId}:${side}`;

const sidesFor = (source: Point, target: Point, orientation: RoutingOrientation): [Side, Side] => {
  if (orientation === "horizontal") return source.x <= target.x ? ["right", "left"] : ["left", "right"];
  return source.y <= target.y ? ["bottom", "top"] : ["top", "bottom"];
};

const port = (position: Point, size: NodeSize, side: Side, offset: number): Point => {
  if (side === "left") return { x: position.x, y: position.y + size.height / 2 + offset };
  if (side === "right") return { x: position.x + size.width, y: position.y + size.height / 2 + offset };
  if (side === "top") return { x: position.x + size.width / 2 + offset, y: position.y };
  return { x: position.x + size.width / 2 + offset, y: position.y + size.height };
};

const offsets = (edges: readonly LocatedEdge[], endpoint: "source" | "target") => {
  const grouped = new Map<string, LocatedEdge[]>();
  for (const edge of edges) {
    const nodeId = edge[endpoint];
    const side = endpoint === "source" ? edge.sourceSide : edge.targetSide;
    const key = sideKey(nodeId, side);
    grouped.set(key, [...(grouped.get(key) ?? []), edge]);
  }
  const result = new Map<string, number>();
  for (const group of grouped.values()) {
    group.sort((left, right) => left.id.localeCompare(right.id));
    group.forEach((edge, index) => result.set(edge.id, (index - (group.length - 1) / 2) * 12));
  }
  return result;
};

export function routeEdges(
  edges: readonly RoutableEdge[],
  positions: Readonly<Record<string, Point>>,
  nodeSize: NodeSize,
  orientation: RoutingOrientation,
): EdgeRoute[] {
  const located: LocatedEdge[] = [];
  for (const edge of edges) {
    const sourcePosition = positions[edge.source];
    const targetPosition = positions[edge.target];
    if (!sourcePosition || !targetPosition) continue;
    const [sourceSide, targetSide] = sidesFor(sourcePosition, targetPosition, orientation);
    located.push({ ...edge, sourcePosition, targetPosition, sourceSide, targetSide });
  }
  located.sort((left, right) => left.id.localeCompare(right.id));

  const sourceOffsets = offsets(located, "source");
  const targetOffsets = offsets(located, "target");
  const parallel = new Map<string, LocatedEdge[]>();
  located.forEach((edge) => {
    const key = `${edge.source}\0${edge.target}`;
    parallel.set(key, [...(parallel.get(key) ?? []), edge]);
  });
  const parallelRank = new Map<string, { rank: number; count: number }>();
  parallel.forEach((group) => group.forEach((edge, rank) => parallelRank.set(edge.id, { rank, count: group.length })));

  return located.map((edge) => {
    const sourcePoint = port(edge.sourcePosition, nodeSize, edge.sourceSide, sourceOffsets.get(edge.id) ?? 0);
    const targetPoint = port(edge.targetPosition, nodeSize, edge.targetSide, targetOffsets.get(edge.id) ?? 0);
    const parallelPosition = parallelRank.get(edge.id)!;
    const bend = (parallelPosition.rank - (parallelPosition.count - 1) / 2) * 10;

    let controlOne: Point;
    let controlTwo: Point;
    if (orientation === "horizontal") {
      const middle = (sourcePoint.x + targetPoint.x) / 2 + bend;
      controlOne = { x: middle, y: sourcePoint.y };
      controlTwo = { x: middle, y: targetPoint.y };
    } else {
      const middle = (sourcePoint.y + targetPoint.y) / 2 + bend;
      controlOne = { x: sourcePoint.x, y: middle };
      controlTwo = { x: targetPoint.x, y: middle };
    }

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourcePoint,
      targetPoint,
      path: `M ${pointText(sourcePoint)} C ${pointText(controlOne)}, ${pointText(controlTwo)}, ${pointText(targetPoint)}`,
    };
  });
}
