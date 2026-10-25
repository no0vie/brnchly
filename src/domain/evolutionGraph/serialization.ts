import { migrateEvolutionGraph } from './migrations';
import type { EvolutionGraph } from './types';
import { validateEvolutionGraph } from './validation';

export class EvolutionGraphImportError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'EvolutionGraphImportError';
    this.cause = options?.cause;
  }
}

export const serializeEvolutionGraph = (graph: EvolutionGraph): string => {
  const validation = validateEvolutionGraph(graph);
  if (!validation.valid) {
    throw new EvolutionGraphImportError(`Cannot serialize invalid Evolution Graph: ${validation.issues.map((issue) => issue.message).join(' ')}`);
  }
  return JSON.stringify(graph, null, 2);
};

export const parseEvolutionGraph = (json: string): EvolutionGraph => {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    throw new EvolutionGraphImportError('Imported content is not valid JSON.', { cause: error });
  }

  let graph: EvolutionGraph;
  try {
    graph = migrateEvolutionGraph(raw);
  } catch (error) {
    throw new EvolutionGraphImportError(error instanceof Error ? error.message : 'Evolution Graph migration failed.', { cause: error });
  }

  const validation = validateEvolutionGraph(graph);
  if (!validation.valid) {
    throw new EvolutionGraphImportError(`Imported content is an invalid Evolution Graph: ${validation.issues.map((issue) => issue.message).join(' ')}`);
  }
  return graph;
};
