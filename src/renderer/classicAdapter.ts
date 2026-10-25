import type { EvolutionGraph } from '../domain/evolutionGraph';
import type { EvolutionStep, GraphItem } from '../types';

const statusDifficulty: Record<EvolutionGraph['nodes'][number]['status'], number> = {
  locked: -8,
  available: -2,
  acquired: 5,
  mastered: 10,
};

export interface ClassicGraphData {
  items: GraphItem[];
  steps: EvolutionStep[];
}

export const toClassicGraphData = (graph: EvolutionGraph): ClassicGraphData => ({
  items: graph.nodes.map((node) => ({
    name: node.title,
    description: node.description ?? '',
    dif: typeof node.metadata?.legacyDifficulty === 'number'
      ? node.metadata.legacyDifficulty
      : statusDifficulty[node.status],
    ...(node.position ? { position: { ...node.position } } : {}),
  })),
  steps: graph.metadata?.legacyEvolutionSteps?.map((step) => ({ ...step }))
    ?? graph.branches.map((branch, index) => ({
      name: branch.title,
      description: branch.description ?? branch.title,
      offset: index * 500,
    })),
});
