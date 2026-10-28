import type {
  EvolutionBranch,
  EvolutionEdge,
  EvolutionGraph,
  EvolutionGraphMetadata,
  EvolutionNode,
  GraphLane,
  GraphStage,
} from "../../domain/evolutionGraph";

export type ReferencedEntityDeletePolicy =
  { mode: "reject" } | { mode: "reassign"; targetId: string } | { mode: "delete-nodes" };

type Patch<T extends { id: string }> = Partial<Omit<T, "id">>;
type GraphRootPatch = Partial<Pick<EvolutionGraph, "title" | "description">>;

export type GraphCommand =
  | { type: "update-graph"; patch: GraphRootPatch }
  | { type: "set-metadata"; metadata?: EvolutionGraphMetadata }
  | { type: "update-metadata"; patch: EvolutionGraphMetadata }
  | { type: "add-node"; node: EvolutionNode }
  | { type: "update-node"; id: string; patch: Patch<EvolutionNode> }
  | { type: "delete-node"; id: string }
  | { type: "reorder-nodes"; ids: string[] }
  | { type: "add-edge"; edge: EvolutionEdge }
  | { type: "update-edge"; id: string; patch: Patch<EvolutionEdge> }
  | { type: "delete-edge"; id: string }
  | { type: "reorder-edges"; ids: string[] }
  | { type: "add-stage"; stage: GraphStage }
  | { type: "update-stage"; id: string; patch: Patch<GraphStage> }
  | { type: "delete-stage"; id: string; policy: ReferencedEntityDeletePolicy }
  | { type: "reorder-stages"; ids: string[] }
  | { type: "add-lane"; lane: GraphLane }
  | { type: "update-lane"; id: string; patch: Patch<GraphLane> }
  | { type: "delete-lane"; id: string; policy: ReferencedEntityDeletePolicy }
  | { type: "reorder-lanes"; ids: string[] }
  | { type: "add-branch"; branch: EvolutionBranch }
  | { type: "update-branch"; id: string; patch: Patch<EvolutionBranch> }
  | { type: "delete-branch"; id: string; policy: ReferencedEntityDeletePolicy }
  | { type: "reorder-branches"; ids: string[] }
  | { type: "transaction"; commands: GraphCommand[] }
  | { type: "batch"; commands: GraphCommand[] };
