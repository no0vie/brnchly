import {
  validateEvolutionGraph,
  type EvolutionGraph,
  type EvolutionGraphValidationResult,
  type EvolutionNode,
} from "../../domain/evolutionGraph";
import type { GraphCommand, ReferencedEntityDeletePolicy } from "./commands";

export interface GraphHistoryData {
  command: GraphCommand;
  before: EvolutionGraph;
  after: EvolutionGraph;
}

export interface ApplyGraphCommandResult {
  success: boolean;
  graph: EvolutionGraph;
  validation: EvolutionGraphValidationResult;
  history?: GraphHistoryData;
  error?: string;
}

type MutableGraph = EvolutionGraph;

const clone = <T>(value: T): T => structuredClone(value);

const fail = (message: string): never => {
  throw new Error(message);
};

const findIndex = <T extends { id: string }>(items: T[], id: string, kind: string): number => {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) fail(`${kind} '${id}' does not exist`);
  return index;
};

const reorder = <T extends { id: string }>(items: T[], ids: string[], kind: string): T[] => {
  if (ids.length !== items.length || new Set(ids).size !== ids.length) fail(`Invalid ${kind} order`);
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = ids.map((id) => byId.get(id) ?? fail(`${kind} '${id}' does not exist`));
  return ordered;
};

const removeNodes = (graph: MutableGraph, predicate: (node: EvolutionNode) => boolean): void => {
  const removed = new Set(graph.nodes.filter(predicate).map(({ id }) => id));
  graph.nodes = graph.nodes.filter((node) => !removed.has(node.id));
  graph.edges = graph.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target));
};

const deleteReferenced = (
  graph: MutableGraph,
  dimension: "branchId" | "stageId" | "laneId",
  id: string,
  policy: ReferencedEntityDeletePolicy,
): void => {
  const referenced = graph.nodes.some((node) => node[dimension] === id);
  if (!referenced) return;
  if (policy.mode === "reject") fail(`Cannot delete referenced ${dimension.replace("Id", "")} '${id}'`);
  if (policy.mode === "delete-nodes") {
    removeNodes(graph, (node) => node[dimension] === id);
    return;
  }
  if (policy.mode !== "reassign") return;
  const targetId = policy.targetId;
  graph.nodes = graph.nodes.map((node) => (node[dimension] === id ? { ...node, [dimension]: targetId } : node));
};

const add = <T extends { id: string }>(items: T[], item: T, kind: string): void => {
  if (items.some(({ id }) => id === item.id)) fail(`${kind} '${item.id}' already exists`);
  items.push(clone(item));
};

const applyOne = (graph: MutableGraph, command: GraphCommand): void => {
  switch (command.type) {
    case "transaction":
    case "batch":
      command.commands.forEach((nested) => applyOne(graph, nested));
      return;
    case "update-graph":
      if (command.patch.title !== undefined) graph.title = command.patch.title;
      if ("description" in command.patch) graph.description = command.patch.description;
      return;
    case "set-metadata":
      graph.metadata = command.metadata === undefined ? undefined : clone(command.metadata);
      return;
    case "update-metadata":
      graph.metadata = { ...(graph.metadata ?? {}), ...clone(command.patch) };
      return;
    case "add-node":
      add(graph.nodes, command.node, "Node");
      return;
    case "update-node": {
      const index = findIndex(graph.nodes, command.id, "Node");
      graph.nodes[index] = { ...graph.nodes[index], ...clone(command.patch) };
      return;
    }
    case "delete-node":
      findIndex(graph.nodes, command.id, "Node");
      removeNodes(graph, ({ id }) => id === command.id);
      return;
    case "reorder-nodes":
      graph.nodes = reorder(graph.nodes, command.ids, "node");
      return;
    case "add-edge":
      add(graph.edges, command.edge, "Edge");
      return;
    case "update-edge": {
      const index = findIndex(graph.edges, command.id, "Edge");
      graph.edges[index] = { ...graph.edges[index], ...clone(command.patch) };
      return;
    }
    case "delete-edge":
      graph.edges.splice(findIndex(graph.edges, command.id, "Edge"), 1);
      return;
    case "reorder-edges":
      graph.edges = reorder(graph.edges, command.ids, "edge");
      return;
    case "add-branch":
      add(graph.branches, command.branch, "Branch");
      return;
    case "update-branch": {
      const index = findIndex(graph.branches, command.id, "Branch");
      graph.branches[index] = { ...graph.branches[index], ...clone(command.patch) };
      return;
    }
    case "delete-branch":
      deleteReferenced(graph, "branchId", command.id, command.policy);
      graph.branches.splice(findIndex(graph.branches, command.id, "Branch"), 1);
      return;
    case "reorder-branches":
      graph.branches = reorder(graph.branches, command.ids, "branch");
      return;
    case "add-stage":
      graph.stages ??= [];
      add(graph.stages, command.stage, "Stage");
      return;
    case "update-stage": {
      const stages = graph.stages ?? fail("Stage collection does not exist");
      const index = findIndex(stages, command.id, "Stage");
      stages[index] = { ...stages[index], ...clone(command.patch) };
      return;
    }
    case "delete-stage": {
      const stages = graph.stages ?? fail("Stage collection does not exist");
      deleteReferenced(graph, "stageId", command.id, command.policy);
      stages.splice(findIndex(stages, command.id, "Stage"), 1);
      return;
    }
    case "reorder-stages": {
      const stages = graph.stages ?? fail("Stage collection does not exist");
      graph.stages = reorder(stages, command.ids, "stage").map((stage, order) => ({ ...stage, order }));
      return;
    }
    case "add-lane":
      graph.lanes ??= [];
      add(graph.lanes, command.lane, "Lane");
      return;
    case "update-lane": {
      const lanes = graph.lanes ?? fail("Lane collection does not exist");
      const index = findIndex(lanes, command.id, "Lane");
      lanes[index] = { ...lanes[index], ...clone(command.patch) };
      return;
    }
    case "delete-lane": {
      const lanes = graph.lanes ?? fail("Lane collection does not exist");
      deleteReferenced(graph, "laneId", command.id, command.policy);
      lanes.splice(findIndex(lanes, command.id, "Lane"), 1);
      return;
    }
    case "reorder-lanes": {
      const lanes = graph.lanes ?? fail("Lane collection does not exist");
      graph.lanes = reorder(lanes, command.ids, "lane").map((lane, coordinate) => ({ ...lane, coordinate }));
    }
  }
};

export const applyGraphCommand = (graph: EvolutionGraph, command: GraphCommand): ApplyGraphCommandResult => {
  const next = clone(graph);
  try {
    applyOne(next, command);
  } catch (error) {
    return {
      success: false,
      graph,
      validation: validateEvolutionGraph(graph),
      error: error instanceof Error ? error.message : "Command failed",
    };
  }

  const validation = validateEvolutionGraph(next);
  if (!validation.valid) return { success: false, graph, validation, error: "Command produced an invalid graph" };
  return { success: true, graph: next, validation, history: { command, before: graph, after: next } };
};
