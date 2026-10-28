import React from "react";
import { CompressOutlined, MinusOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Select, Space, Tooltip } from "antd";
import type { EvolutionGraph, EvolutionLayoutStrategy } from "../../domain/evolutionGraph";

interface GraphToolbarProps {
  layout: EvolutionLayoutStrategy;
  stages: NonNullable<EvolutionGraph["stages"]>;
  lanes: NonNullable<EvolutionGraph["lanes"]>;
  activeStageId?: string;
  activeLaneId?: string;
  zoom: number;
  onLayoutChange?: (layout: EvolutionLayoutStrategy) => void;
  onFocusStage: (id: string) => void;
  onFocusLane: (id: string) => void;
  onClearFocus: () => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
  onReset: () => void;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  layout,
  stages,
  lanes,
  activeStageId,
  activeLaneId,
  zoom,
  onLayoutChange,
  onFocusStage,
  onFocusLane,
  onClearFocus,
  onZoom,
  onFit,
  onReset,
}) => (
  <div className="graph-toolbar">
    <Space wrap size="small">
      {onLayoutChange && (
        <Select
          aria-label="Layout"
          value={layout}
          onChange={onLayoutChange}
          options={[
            { value: "stage-lane", label: "Stage / Lane" },
            { value: "horizontal-dag", label: "Horizontal DAG" },
            { value: "vertical-dag", label: "Vertical DAG" },
            { value: "radial", label: "Radial" },
            { value: "manual", label: "Manual" },
          ]}
          style={{ width: 160 }}
        />
      )}
      {layout === "stage-lane" && stages.length > 0 && (
        <Select
          aria-label="Focus stage"
          allowClear
          placeholder="Focus stage"
          value={activeStageId}
          onChange={(id) => (id ? onFocusStage(id) : onClearFocus())}
          options={stages.map((stage) => ({ value: stage.id, label: stage.title }))}
          style={{ width: 150 }}
        />
      )}
      {layout === "stage-lane" && lanes.length > 0 && (
        <Select
          aria-label="Focus lane"
          allowClear
          placeholder="Focus lane"
          value={activeLaneId}
          onChange={(id) => (id ? onFocusLane(id) : onClearFocus())}
          options={lanes.map((lane) => ({ value: lane.id, label: lane.title }))}
          style={{ width: 150 }}
        />
      )}
      <Tooltip title="Zoom out">
        <Button aria-label="Zoom out" icon={<MinusOutlined />} onClick={() => onZoom(0.85)} />
      </Tooltip>
      <Tooltip title="Zoom in">
        <Button aria-label="Zoom in" icon={<PlusOutlined />} onClick={() => onZoom(1.15)} />
      </Tooltip>
      <Tooltip title="Fit to view">
        <Button aria-label="Fit to view" icon={<CompressOutlined />} onClick={onFit} />
      </Tooltip>
      <Tooltip title="Reset view">
        <Button aria-label="Reset view" icon={<ReloadOutlined />} onClick={onReset} />
      </Tooltip>
      <span className="graph-toolbar__zoom">{Math.round(zoom * 100)}%</span>
    </Space>
    <div className="graph-legend" aria-label="Edge legend">
      <span className="graph-legend__dependency">→ dependency</span>
      <span className="graph-legend__evolution">→ evolution</span>
      <span className="graph-legend__related">— related</span>
    </div>
  </div>
);
