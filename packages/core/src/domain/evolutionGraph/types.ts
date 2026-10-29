export const CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION = 2 as const;

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
  stageId?: string;
  laneId?: string;
}

export interface EvolutionBranch {
  id: string;
  title: string;
  color: string;
  description?: string;
}

export interface GraphStage {
  id: string;
  title: string;
  order: number;
  description?: string;
}

export interface GraphLane {
  id: string;
  title: string;
  coordinate: number;
  color?: string;
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

/** Schema 1 remains accepted at TypeScript call sites; imports and serialization upgrade it to v2. */
export interface EvolutionGraph {
  schemaVersion: 1 | typeof CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  branches: EvolutionBranch[];
  stages?: GraphStage[];
  lanes?: GraphLane[];
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  metadata?: EvolutionGraphMetadata;
}

export type EvolutionGraphV2 = EvolutionGraph & { schemaVersion: 2 };
