export const CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION = 1 as const;

export type NodeStatus = "locked" | "available" | "acquired" | "mastered";
export type EvolutionEdgeType = "dependency" | "evolution" | "related";

export interface Position {
  x: number;
  y: number;
}

export interface EvolutionEvidence {
  title: string;
  description?: string;
  url?: string;
}

export interface EvolutionNode {
  id: string;
  title: string;
  description?: string;
  branchId: string;
  status: NodeStatus;
  icon?: string;
  level?: number;
  acquiredAt?: string;
  evidence?: EvolutionEvidence[];
  position?: Position;
  metadata?: Record<string, unknown>;
}

export interface EvolutionBranch {
  id: string;
  title: string;
  color: string;
  description?: string;
}

export interface EvolutionEdge {
  id: string;
  source: string;
  target: string;
  type: EvolutionEdgeType;
}

export interface LegacyEvolutionStepMetadata {
  offset: number;
  description: string;
  name: string;
}

export interface EvolutionGraphMetadata {
  legacyEvolutionSteps?: LegacyEvolutionStepMetadata[];
  [key: string]: unknown;
}

export interface EvolutionGraph {
  schemaVersion: typeof CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  branches: EvolutionBranch[];
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  metadata?: EvolutionGraphMetadata;
}
