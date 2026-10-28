import { validateEvolutionGraph, type EvolutionGraph } from "../../domain/evolutionGraph";
import { applyGraphCommand, type ApplyGraphCommandResult, type GraphHistoryData } from "./apply";
import type { GraphCommand } from "./commands";

export interface GraphHistory {
  graph: EvolutionGraph;
  past: GraphHistoryData[];
  future: GraphHistoryData[];
  depth: number;
}

export interface HistoryResult {
  history: GraphHistory;
  result: ApplyGraphCommandResult;
}

export interface CreateGraphHistoryOptions {
  depth?: number;
}

export const createGraphHistory = (graph: EvolutionGraph, options: CreateGraphHistoryOptions = {}): GraphHistory => ({
  graph,
  past: [],
  future: [],
  depth: Math.max(0, Math.floor(options.depth ?? 100)),
});

export const executeGraphCommand = (history: GraphHistory, command: GraphCommand): HistoryResult => {
  const result = applyGraphCommand(history.graph, command);
  if (!result.success || !result.history) return { history, result };
  const past = [...history.past, result.history];
  return {
    result,
    history: {
      ...history,
      graph: result.graph,
      past: history.depth === 0 ? [] : past.slice(-history.depth),
      future: [],
    },
  };
};

const unchangedResult = (graph: EvolutionGraph): ApplyGraphCommandResult => ({
  success: false,
  graph,
  validation: validateEvolutionGraph(graph),
  error: "No history operation available",
});

export const undo = (history: GraphHistory): HistoryResult => {
  const operation = history.past[history.past.length - 1];
  if (!operation) return { history, result: unchangedResult(history.graph) };
  const graph = operation.before;
  return {
    history: {
      ...history,
      graph,
      past: history.past.slice(0, -1),
      future: [operation, ...history.future],
    },
    result: { success: true, graph, validation: validateEvolutionGraph(graph), history: operation },
  };
};

export const redo = (history: GraphHistory): HistoryResult => {
  const operation = history.future[0];
  if (!operation) return { history, result: unchangedResult(history.graph) };
  const graph = operation.after;
  const past = [...history.past, operation];
  return {
    history: {
      ...history,
      graph,
      past: history.depth === 0 ? [] : past.slice(-history.depth),
      future: history.future.slice(1),
    },
    result: { success: true, graph, validation: validateEvolutionGraph(graph), history: operation },
  };
};
