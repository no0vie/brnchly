import React from "react";
import type { EvolutionGraph, EvolutionLayoutStrategy } from "@no0vie/brnchly-core";

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

const layouts: Array<{ value: EvolutionLayoutStrategy; label: string }> = [
  { value: "stage-lane", label: "Stage / Lane" },
  { value: "horizontal-dag", label: "Horizontal DAG" },
  { value: "vertical-dag", label: "Vertical DAG" },
  { value: "radial", label: "Radial" },
  { value: "manual", label: "Manual" },
];

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
    <div className="graph-toolbar__controls">
      {onLayoutChange && (
        <select
          className="graph-toolbar__select graph-toolbar__select--layout"
          aria-label="Layout"
          value={layout}
          onChange={(event) => onLayoutChange(event.target.value as EvolutionLayoutStrategy)}
        >
          {layouts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {layout === "stage-lane" && stages.length > 0 && (
        <select
          className="graph-toolbar__select"
          aria-label="Focus stage"
          value={activeStageId ?? ""}
          onChange={(event) => (event.target.value ? onFocusStage(event.target.value) : onClearFocus())}
        >
          <option value="">Focus stage</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.title}
            </option>
          ))}
        </select>
      )}
      {layout === "stage-lane" && lanes.length > 0 && (
        <select
          className="graph-toolbar__select"
          aria-label="Focus lane"
          value={activeLaneId ?? ""}
          onChange={(event) => (event.target.value ? onFocusLane(event.target.value) : onClearFocus())}
        >
          <option value="">Focus lane</option>
          {lanes.map((lane) => (
            <option key={lane.id} value={lane.id}>
              {lane.title}
            </option>
          ))}
        </select>
      )}
      <button
        className="graph-toolbar__button"
        type="button"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => onZoom(0.85)}
      >
        −
      </button>
      <button
        className="graph-toolbar__button"
        type="button"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => onZoom(1.15)}
      >
        +
      </button>
      <button
        className="graph-toolbar__button"
        type="button"
        aria-label="Fit to view"
        title="Fit to view"
        onClick={onFit}
      >
        ↙
      </button>
      <button
        className="graph-toolbar__button"
        type="button"
        aria-label="Reset view"
        title="Reset view"
        onClick={onReset}
      >
        ↻
      </button>
      <span className="graph-toolbar__zoom">{Math.round(zoom * 100)}%</span>
    </div>
    <div className="graph-legend" aria-label="Edge legend">
      <span className="graph-legend__dependency">→ dependency</span>
      <span className="graph-legend__evolution">→ evolution</span>
      <span className="graph-legend__related">— related</span>
    </div>
  </div>
);
