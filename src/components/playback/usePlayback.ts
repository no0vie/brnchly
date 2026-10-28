import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlaybackController, nextStageCheckpoint, previousStageCheckpoint } from "../../graph/playback";
import type { EvolutionGraph } from "../../domain/evolutionGraph";
import type { PlaybackCameraMode, PlaybackSnapshot } from "../../graph/playback";

export interface PlaybackOptions {
  stageDuration?: number;
  transitionDuration?: number;
  autoplay?: boolean;
  cameraMode?: PlaybackCameraMode;
}

export const usePlayback = (graph: EvolutionGraph, options: PlaybackOptions = {}) => {
  const controller = useMemo(
    () =>
      new PlaybackController(graph, {
        stageDuration: options.stageDuration ?? 2400,
        transitionDuration: options.transitionDuration ?? 350,
        speed: 1,
        autoplay: options.autoplay ?? false,
        cameraMode: "manual",
      }),
    [graph, options.autoplay, options.stageDuration, options.transitionDuration],
  );
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(controller.snapshot);
  const [speed, setSpeedState] = useState(1);
  const frame = useRef<number>();
  const lastTime = useRef<number>();

  useEffect(() => {
    setSnapshot(controller.snapshot);
    setSpeedState(1);
  }, [controller]);

  useEffect(() => {
    if (snapshot.status !== "playing") return;
    const update = (time: number) => {
      const delta = lastTime.current === undefined ? 0 : time - lastTime.current;
      lastTime.current = time;
      const next = controller.tick(delta);
      setSnapshot(next);
      if (next.status === "playing") frame.current = requestAnimationFrame(update);
    };
    frame.current = requestAnimationFrame(update);
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
      lastTime.current = undefined;
    };
  }, [controller, snapshot.status]);

  const apply = useCallback((next: PlaybackSnapshot) => setSnapshot({ ...next }), []);
  const play = useCallback(() => apply(controller.play()), [apply, controller]);
  const pause = useCallback(() => apply(controller.pause()), [apply, controller]);
  const restart = useCallback(() => apply(controller.restart()), [apply, controller]);
  const seek = useCallback((progress: number) => apply(controller.seek({ progress })), [apply, controller]);
  const setSpeed = useCallback(
    (next: number) => {
      controller.setSpeed(next);
      setSpeedState(next);
    },
    [controller],
  );
  const nextStage = useCallback(() => {
    const checkpoint = nextStageCheckpoint(controller.plan, { time: controller.snapshot.time });
    apply(controller.seek(checkpoint ? { time: checkpoint.time } : { progress: 1 }));
  }, [apply, controller]);
  const previousStage = useCallback(() => {
    const checkpoint = previousStageCheckpoint(controller.plan, { time: controller.snapshot.time });
    apply(controller.seek(checkpoint ? { time: checkpoint.time } : { progress: 0 }));
  }, [apply, controller]);

  return { snapshot, speed, play, pause, restart, seek, setSpeed, nextStage, previousStage };
};
