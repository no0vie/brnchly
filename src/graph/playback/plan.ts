import type { EvolutionGraph } from "../../domain/evolutionGraph";
import type {
  PlaybackConfig,
  PlaybackGroup,
  PlaybackPlan,
  PlaybackPosition,
  PlaybackSnapshot,
  PlaybackStatus,
  StageCheckpoint,
} from "./types";

const compareIds = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const assertConfig = (config: PlaybackConfig) => {
  if (!Number.isFinite(config.stageDuration) || config.stageDuration < 0) {
    throw new Error("stageDuration must be a finite non-negative number.");
  }
  if (!Number.isFinite(config.transitionDuration) || config.transitionDuration < 0) {
    throw new Error("transitionDuration must be a finite non-negative number.");
  }
  if (!Number.isFinite(config.speed) || config.speed <= 0) throw new Error("speed must be a finite positive number.");
};

const sourceCycleNodes = (pending: Set<string>, incoming: Map<string, Set<string>>): string[] => {
  let nextIndex = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (id: string) => {
    indices.set(id, nextIndex);
    lowLinks.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);
    for (const target of pending) {
      if (!incoming.get(target)!.has(id)) continue;
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(id, Math.min(lowLinks.get(id)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(id, Math.min(lowLinks.get(id)!, indices.get(target)!));
      }
    }
    if (lowLinks.get(id) !== indices.get(id)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== id);
    components.push(component);
  };

  [...pending].sort(compareIds).forEach((id) => {
    if (!indices.has(id)) visit(id);
  });
  const componentByNode = new Map(
    components.flatMap((component, index) => component.map((id) => [id, index] as const)),
  );
  const sourceComponents = components.filter((component, index) =>
    component.every((id) =>
      [...incoming.get(id)!].every((source) => !pending.has(source) || componentByNode.get(source) === index),
    ),
  );
  return sourceComponents.flat().sort(compareIds);
};

const topologicalBatches = (graph: EvolutionGraph, nodeIds: readonly string[]): string[][] => {
  const ids = new Set(nodeIds);
  const incoming = new Map(nodeIds.map((id) => [id, new Set<string>()]));
  graph.edges.forEach(({ source, target, type }) => {
    if (type !== "related" && source !== target && ids.has(source) && ids.has(target))
      incoming.get(target)!.add(source);
  });

  const pending = new Set(nodeIds);
  const batches: string[][] = [];
  while (pending.size > 0) {
    const ready = [...pending]
      .filter((id) => [...incoming.get(id)!].every((source) => !pending.has(source)))
      .sort(compareIds);
    const batch = ready.length > 0 ? ready : sourceCycleNodes(pending, incoming);
    batches.push(batch);
    batch.forEach((id) => pending.delete(id));
  }
  return batches;
};

const orderedGroups = (graph: EvolutionGraph): Array<{ stageId: string | null; nodeIds: string[] }> => {
  const sortedNodeIds = [...graph.nodes].map(({ id }) => id).sort(compareIds);
  if (!graph.stages?.length)
    return topologicalBatches(graph, sortedNodeIds).map((nodeIds) => ({ stageId: null, nodeIds }));

  const groups: Array<{ stageId: string | null; nodeIds: string[] }> = [...graph.stages]
    .sort((left, right) => left.order - right.order || compareIds(left.id, right.id))
    .map(({ id }) => ({
      stageId: id,
      nodeIds: graph.nodes
        .filter(({ stageId }) => stageId === id)
        .map(({ id: nodeId }) => nodeId)
        .sort(compareIds),
    }));
  const knownStages = new Set(graph.stages.map(({ id }) => id));
  const unstaged = graph.nodes
    .filter(({ stageId }) => !stageId || !knownStages.has(stageId))
    .map(({ id }) => id)
    .sort(compareIds);
  if (unstaged.length > 0) groups.push({ stageId: null, nodeIds: unstaged });
  return groups;
};

export const createPlaybackPlan = (graph: EvolutionGraph, config: PlaybackConfig): PlaybackPlan => {
  assertConfig(config);
  const rawGroups = orderedGroups(graph);
  const duration =
    rawGroups.length === 0
      ? 0
      : rawGroups.length * config.stageDuration + (rawGroups.length - 1) * config.transitionDuration;
  const groups: PlaybackGroup[] = rawGroups.map((group, index) => {
    const startTime = index * (config.stageDuration + config.transitionDuration);
    return { ...group, startTime, endTime: startTime + config.stageDuration };
  });
  const nodeRevealTimes: Record<string, number> = {};
  groups.forEach(({ nodeIds, startTime }) => {
    nodeIds.forEach((id, index) => {
      nodeRevealTimes[id] = startTime + (nodeIds.length === 0 ? 0 : (index * config.stageDuration) / nodeIds.length);
    });
  });
  const stageCheckpoints: StageCheckpoint[] = groups.flatMap(({ stageId, startTime }) =>
    stageId === null ? [] : [{ stageId, time: startTime, progress: duration === 0 ? 0 : startTime / duration }],
  );
  return {
    graph,
    config: { ...config },
    groups,
    duration,
    stageCheckpoints,
    nodeRevealTimes,
  };
};

const positionTime = (plan: PlaybackPlan, position: PlaybackPosition) => {
  const raw =
    typeof position === "number" ? position : "time" in position ? position.time : position.progress * plan.duration;
  return clamp(Number.isFinite(raw) ? raw : 0, 0, plan.duration);
};

const statusAt = (time: number, duration: number): PlaybackStatus => {
  if (duration > 0 && time >= duration) return "completed";
  return time === 0 ? "idle" : "paused";
};

export const snapshotAt = (
  plan: PlaybackPlan,
  position: PlaybackPosition,
  previousPosition?: PlaybackPosition,
): PlaybackSnapshot => {
  const time = positionTime(plan, position);
  const previousTime = previousPosition === undefined ? time : positionTime(plan, previousPosition);
  const visibleNodeIds = Object.keys(plan.nodeRevealTimes)
    .filter((id) => plan.nodeRevealTimes[id] <= time)
    .sort(compareIds);
  const previousNodes = new Set(
    Object.keys(plan.nodeRevealTimes).filter((id) => plan.nodeRevealTimes[id] <= previousTime),
  );
  const visibleNodes = new Set(visibleNodeIds);
  const visibleEdgeIds = plan.graph.edges
    .filter(({ source, target }) => visibleNodes.has(source) && visibleNodes.has(target))
    .map(({ id }) => id)
    .sort(compareIds);
  const previousVisibleEdges = new Set(
    plan.graph.edges
      .filter(({ source, target }) => previousNodes.has(source) && previousNodes.has(target))
      .map(({ id }) => id),
  );
  const activeGroup = plan.groups.find(({ startTime, endTime }) => time >= startTime && time <= endTime);
  return {
    status: statusAt(time, plan.duration),
    time,
    progress: plan.duration === 0 ? 1 : time / plan.duration,
    activeStageId: activeGroup?.stageId ?? null,
    visibleNodeIds,
    visibleEdgeIds,
    newlyVisibleNodeIds: visibleNodeIds.filter((id) => !previousNodes.has(id)),
    newlyVisibleEdgeIds: visibleEdgeIds.filter((id) => !previousVisibleEdges.has(id)),
    cameraMode: plan.config.cameraMode,
  };
};

export const nextStageCheckpoint = (plan: PlaybackPlan, position: PlaybackPosition) => {
  const time = positionTime(plan, position);
  return plan.stageCheckpoints.find((checkpoint) => checkpoint.time > time);
};

export const previousStageCheckpoint = (plan: PlaybackPlan, position: PlaybackPosition) => {
  const time = positionTime(plan, position);
  return [...plan.stageCheckpoints].reverse().find((checkpoint) => checkpoint.time < time);
};
