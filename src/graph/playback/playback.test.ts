import { describe, expect, it } from "vitest";
import type { EvolutionGraph } from "../../domain/evolutionGraph";
import {
  PlaybackController,
  createPlaybackPlan,
  nextStageCheckpoint,
  previousStageCheckpoint,
  snapshotAt,
  type PlaybackConfig,
} from "./index";

const config: PlaybackConfig = {
  stageDuration: 100,
  transitionDuration: 20,
  speed: 1,
  autoplay: false,
  cameraMode: "follow",
};

const graph = (overrides: Partial<EvolutionGraph> = {}): EvolutionGraph => ({
  schemaVersion: 2,
  id: "g",
  title: "Graph",
  branches: [{ id: "main", title: "Main", color: "#fff" }],
  nodes: [],
  edges: [],
  ...overrides,
});

const node = (id: string, stageId?: string) => ({
  id,
  title: id,
  branchId: "main",
  status: "available" as const,
  ...(stageId ? { stageId } : {}),
});

describe("deterministic playback plan", () => {
  it("orders stages by order then id and reveals each stage's nodes by id", () => {
    const input = graph({
      stages: [
        { id: "z", title: "Z", order: 1 },
        { id: "b", title: "B", order: 0 },
        { id: "a", title: "A", order: 1 },
      ],
      nodes: [node("z2", "z"), node("a1", "a"), node("b2", "b"), node("b1", "b")],
    });

    const plan = createPlaybackPlan(input, config);

    expect(plan.groups.map(({ stageId, nodeIds }) => ({ stageId, nodeIds }))).toEqual([
      { stageId: "b", nodeIds: ["b1", "b2"] },
      { stageId: "a", nodeIds: ["a1"] },
      { stageId: "z", nodeIds: ["z2"] },
    ]);
    expect(snapshotAt(plan, 49).visibleNodeIds).toEqual(["b1"]);
    expect(snapshotAt(plan, 50).visibleNodeIds).toEqual(["b1", "b2"]);
    expect(snapshotAt(plan, 120).activeStageId).toBe("a");
  });

  it("shows edges in id order only after both endpoints are visible", () => {
    const input = graph({
      stages: [{ id: "s", title: "S", order: 0 }],
      nodes: [node("b", "s"), node("a", "s")],
      edges: [
        { id: "z", source: "a", target: "b", type: "related" },
        { id: "a", source: "a", target: "b", type: "dependency" },
      ],
    });
    const plan = createPlaybackPlan(input, config);

    expect(snapshotAt(plan, 49).visibleEdgeIds).toEqual([]);
    expect(snapshotAt(plan, 50).visibleEdgeIds).toEqual(["a", "z"]);
  });

  it("uses deterministic topological batches, ignores related edges, and releases cycles", () => {
    const input = graph({
      nodes: [node("after-cycle"), node("d"), node("c"), node("b"), node("a"), node("root")],
      edges: [
        { id: "ra", source: "root", target: "a", type: "dependency" },
        { id: "ab", source: "a", target: "b", type: "evolution" },
        { id: "bc", source: "b", target: "c", type: "dependency" },
        { id: "cb", source: "c", target: "b", type: "dependency" },
        { id: "cycle-child", source: "c", target: "after-cycle", type: "dependency" },
        { id: "related", source: "root", target: "d", type: "related" },
      ],
    });

    const plan = createPlaybackPlan(input, config);

    expect(plan.groups.map(({ nodeIds }) => nodeIds)).toEqual([["d", "root"], ["a"], ["b", "c"], ["after-cycle"]]);
    expect(snapshotAt(plan, plan.duration).visibleNodeIds).toEqual(["a", "after-cycle", "b", "c", "d", "root"]);
  });

  it("seeks by clamped time or normalized progress and reports newly visible IDs", () => {
    const input = graph({
      stages: [{ id: "s", title: "S", order: 0 }],
      nodes: [node("a", "s"), node("b", "s")],
    });
    const plan = createPlaybackPlan(input, config);

    expect(snapshotAt(plan, { progress: 0.5 }, 0)).toMatchObject({
      time: 50,
      progress: 0.5,
      visibleNodeIds: ["a", "b"],
      newlyVisibleNodeIds: ["b"],
    });
    expect(snapshotAt(plan, { progress: 2 }).status).toBe("completed");
    expect(snapshotAt(plan, -10).time).toBe(0);
  });

  it("exposes stage checkpoints and strict previous/next navigation", () => {
    const input = graph({
      stages: [
        { id: "a", title: "A", order: 0 },
        { id: "b", title: "B", order: 1 },
      ],
      nodes: [node("a", "a"), node("b", "b")],
    });
    const plan = createPlaybackPlan(input, config);

    expect(plan.stageCheckpoints).toEqual([
      { stageId: "a", time: 0, progress: 0 },
      { stageId: "b", time: 120, progress: 120 / 220 },
    ]);
    expect(nextStageCheckpoint(plan, 0)?.stageId).toBe("b");
    expect(previousStageCheckpoint(plan, 120)?.stageId).toBe("a");
  });
});

describe("PlaybackController", () => {
  it("supports play, pause, resume, restart, seek, and deterministic ticking", () => {
    const controller = new PlaybackController(
      graph({ stages: [{ id: "s", title: "S", order: 0 }], nodes: [node("a", "s"), node("b", "s")] }),
      config,
    );

    expect(controller.snapshot.status).toBe("idle");
    controller.play();
    controller.tick(50);
    expect(controller.snapshot).toMatchObject({ status: "playing", time: 50, newlyVisibleNodeIds: ["b"] });
    controller.pause();
    controller.tick(20);
    expect(controller.snapshot.time).toBe(50);
    controller.resume();
    controller.tick(50);
    expect(controller.snapshot.status).toBe("completed");
    controller.seek({ progress: 0.25 });
    expect(controller.snapshot).toMatchObject({ status: "paused", time: 25 });
    controller.restart();
    expect(controller.snapshot).toMatchObject({ status: "idle", time: 0 });
  });

  it("preserves playback position when speed changes and applies speed to future ticks", () => {
    const controller = new PlaybackController(
      graph({ stages: [{ id: "s", title: "S", order: 0 }], nodes: [node("a", "s")] }),
      { ...config, autoplay: true },
    );

    controller.tick(25);
    controller.setSpeed(2);
    expect(controller.snapshot.time).toBe(25);
    controller.tick(25);
    expect(controller.snapshot.time).toBe(75);
  });
});
