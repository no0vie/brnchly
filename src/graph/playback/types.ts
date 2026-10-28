import type { EvolutionGraph } from "../../domain/evolutionGraph";

export type PlaybackStatus = "idle" | "playing" | "paused" | "completed";
export type PlaybackCameraMode = "follow" | "overview" | "manual" | "static" | "fit";

export interface PlaybackConfig {
  stageDuration: number;
  transitionDuration: number;
  speed: number;
  autoplay: boolean;
  cameraMode: PlaybackCameraMode;
}

export interface PlaybackGroup {
  stageId: string | null;
  nodeIds: readonly string[];
  startTime: number;
  endTime: number;
}

export interface StageCheckpoint {
  stageId: string;
  time: number;
  progress: number;
}

export interface PlaybackPlan {
  readonly graph: EvolutionGraph;
  readonly config: Readonly<PlaybackConfig>;
  readonly groups: readonly PlaybackGroup[];
  readonly duration: number;
  readonly stageCheckpoints: readonly StageCheckpoint[];
  readonly nodeRevealTimes: Readonly<Record<string, number>>;
}

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  time: number;
  progress: number;
  activeStageId: string | null;
  visibleNodeIds: string[];
  visibleEdgeIds: string[];
  newlyVisibleNodeIds: string[];
  newlyVisibleEdgeIds: string[];
  cameraMode: PlaybackCameraMode;
}

export type PlaybackPosition = number | { time: number } | { progress: number };
