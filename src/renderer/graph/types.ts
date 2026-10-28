import type { EvolutionGraph, EvolutionLayoutStrategy, EvolutionNode, Position } from "../../domain/evolutionGraph";
import type { Viewport } from "../../viewport";
import type { TraversalMode } from "../../graph/traversal";

export interface CameraTransitionOptions {
  duration?: number;
  easing?: "linear" | "easeInOut";
  signal?: AbortSignal;
}

export interface GraphRendererHandle {
  fitToView: (options?: CameraTransitionOptions) => void;
  resetView: (options?: CameraTransitionOptions) => void;
  focusStage: (stageId: string, options?: CameraTransitionOptions) => void;
  focusLane: (laneId: string, options?: CameraTransitionOptions) => void;
  focusNode: (nodeId: string, options?: CameraTransitionOptions) => void;
  setCamera: (viewport: Viewport, options?: CameraTransitionOptions) => void;
  getCamera: () => Viewport;
  cancelCameraTransition: () => void;
}

export interface GraphHighlightState {
  rootNodeId: string | null;
  traversalMode: TraversalMode;
  selectedLaneIds: ReadonlySet<string>;
}

export interface GraphRendererProps {
  graph: EvolutionGraph;
  layout: EvolutionLayoutStrategy;
  readonly?: boolean;
  showLaneLabels?: boolean;
  onNodeClick?: (node: EvolutionNode) => void;
  editingEnabled?: boolean;
  selectedNodeIds?: ReadonlySet<string>;
  onNodePositionCommit?: (nodeId: string, position: Position) => void;
  onConnectionCommit?: (sourceNodeId: string, targetNodeId: string) => void;
  selectedNodeId?: string | null;
  /** Initial selection for uncontrolled use. Later prop changes do not overwrite user selection. */
  defaultSelectedNodeId?: string | null;
  onSelectedNodeChange?: (nodeId: string | null) => void;
  /** @deprecated Use onSelectedNodeChange. */
  onNodeSelectionChange?: (nodeId: string | undefined) => void;
  camera?: Viewport;
  defaultCamera?: Viewport;
  onCameraChange?: (camera: Viewport) => void;
  onLayoutChange?: (layout: EvolutionLayoutStrategy) => void;
  onManualCameraInteraction?: () => void;
  visibleNodeIds?: ReadonlySet<string>;
  visibleEdgeIds?: ReadonlySet<string>;
  newNodeIds?: ReadonlySet<string>;
  activeStageId?: string | null;
  highlightState?: GraphHighlightState;
  highlightedNodeIds?: ReadonlySet<string>;
  highlightedEdgeIds?: ReadonlySet<string>;
  highlightedLaneIds?: ReadonlySet<string>;
}
