import type { EvolutionGraph } from "../../domain/evolutionGraph";
import { createPlaybackPlan, snapshotAt } from "./plan";
import type { PlaybackConfig, PlaybackPlan, PlaybackPosition, PlaybackSnapshot } from "./types";

export class PlaybackController {
  readonly plan: PlaybackPlan;
  private speed: number;
  private current: PlaybackSnapshot;

  constructor(graph: EvolutionGraph, config: PlaybackConfig) {
    this.plan = createPlaybackPlan(graph, config);
    this.speed = config.speed;
    this.current = snapshotAt(this.plan, 0);
    if (config.autoplay && this.plan.duration > 0) this.current = { ...this.current, status: "playing" };
  }

  get snapshot(): PlaybackSnapshot {
    return this.current;
  }

  play(): PlaybackSnapshot {
    if (this.current.status === "completed") this.current = snapshotAt(this.plan, 0, this.current.time);
    if (this.plan.duration > 0) this.current = { ...this.current, status: "playing" };
    return this.current;
  }

  pause(): PlaybackSnapshot {
    if (this.current.status === "playing") this.current = { ...this.current, status: "paused" };
    return this.current;
  }

  resume(): PlaybackSnapshot {
    return this.play();
  }

  restart(): PlaybackSnapshot {
    this.current = snapshotAt(this.plan, 0, this.current.time);
    if (this.plan.config.autoplay && this.plan.duration > 0) this.current = { ...this.current, status: "playing" };
    return this.current;
  }

  seek(position: PlaybackPosition): PlaybackSnapshot {
    this.current = snapshotAt(this.plan, position, this.current.time);
    return this.current;
  }

  setSpeed(speed: number): PlaybackSnapshot {
    if (!Number.isFinite(speed) || speed <= 0) throw new Error("speed must be a finite positive number.");
    this.speed = speed;
    return this.current;
  }

  tick(deltaMs: number): PlaybackSnapshot {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("deltaMs must be a finite non-negative number.");
    if (this.current.status !== "playing") return this.current;
    const previousTime = this.current.time;
    this.current = snapshotAt(this.plan, previousTime + deltaMs * this.speed, previousTime);
    if (this.current.status !== "completed") this.current = { ...this.current, status: "playing" };
    return this.current;
  }
}
