import React from "react";
import { Button, Select, Slider, Space } from "antd";
import {
  CaretRightOutlined,
  PauseOutlined,
  ReloadOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from "@ant-design/icons";
import type { PlaybackSnapshot } from "../../graph/playback";

interface PlaybackControlsProps {
  snapshot: PlaybackSnapshot;
  speed: number;
  stageTitle?: string;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPreviousStage: () => void;
  onNextStage: () => void;
  onSeek: (progress: number) => void;
  onSpeedChange: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  snapshot,
  speed,
  stageTitle,
  onPlay,
  onPause,
  onRestart,
  onPreviousStage,
  onNextStage,
  onSeek,
  onSpeedChange,
}) => (
  <div className="playback-controls" aria-label="Evolution playback controls">
    <Space size="small">
      <Button aria-label="Restart evolution" icon={<ReloadOutlined />} onClick={onRestart} />
      <Button aria-label="Previous stage" icon={<StepBackwardOutlined />} onClick={onPreviousStage} />
      {snapshot.status === "playing" ? (
        <Button aria-label="Pause evolution" type="primary" icon={<PauseOutlined />} onClick={onPause} />
      ) : (
        <Button
          aria-label={snapshot.status === "paused" ? "Resume evolution" : "Play evolution"}
          type="primary"
          icon={<CaretRightOutlined />}
          onClick={onPlay}
        />
      )}
      <Button aria-label="Next stage" icon={<StepForwardOutlined />} onClick={onNextStage} />
    </Space>
    <Slider
      aria-label="Evolution progress"
      min={0}
      max={1000}
      value={Math.round(snapshot.progress * 1000)}
      onChange={(value) => onSeek(value / 1000)}
      tooltip={{ formatter: (value) => `${Math.round((value ?? 0) / 10)}%` }}
    />
    <Select
      aria-label="Playback speed"
      value={speed}
      onChange={onSpeedChange}
      options={[0.5, 1, 1.5, 2].map((value) => ({ value, label: `${value}×` }))}
    />
    <span className="playback-progress" role="status" aria-live="polite">
      {stageTitle ? `Current stage: ${stageTitle}. ` : ""}
      {Math.round(snapshot.progress * 100)}%
    </span>
  </div>
);
