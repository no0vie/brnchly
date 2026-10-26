import React, { useMemo } from "react";
import SporeGraphAntd from "../components/SporeGraphAntd";
import { GraphRenderer } from "./GraphRenderer";
import type {
  EvolutionGraph,
  EvolutionGraphMode,
  EvolutionGraphTheme,
  EvolutionLayoutStrategy,
  EvolutionNode,
} from "../domain/evolutionGraph";
import { toClassicGraphData } from "./classicAdapter";

export interface EvolutionGraphViewProps {
  graph: EvolutionGraph;
  mode?: EvolutionGraphMode;
  readonly?: boolean;
  theme?: EvolutionGraphTheme;
  autoplay?: boolean;
  direction?: "horizontal" | "vertical";
  autoScrollSpeed?: number;
  layout?: EvolutionLayoutStrategy;
  showLaneLabels?: boolean;
  onLayoutChange?: (layout: EvolutionLayoutStrategy) => void;
  onNodeClick?: (node: EvolutionNode) => void;
}

export const EvolutionGraphView: React.FC<EvolutionGraphViewProps> = ({
  graph,
  mode = "classic",
  readonly = true,
  theme = "dark",
  autoplay = false,
  direction = "horizontal",
  autoScrollSpeed = 35,
  layout = graph.stages?.length && graph.lanes?.length ? "stage-lane" : "horizontal-dag",
  showLaneLabels = true,
  onLayoutChange,
  onNodeClick,
}) => {
  const classicData = useMemo(() => toClassicGraphData(graph), [graph]);

  return (
    <div
      data-evolution-graph-id={graph.id}
      data-mode={mode}
      data-readonly={readonly}
      data-theme={theme}
      data-autoplay={autoplay}
    >
      {mode !== "graph" ? (
        <SporeGraphAntd
          items={classicData.items}
          corner={classicData.steps}
          scrollDirection={direction}
          autoScrollSpeed={autoScrollSpeed}
          autoPlay={autoplay}
          onItemClick={(index) => onNodeClick?.(graph.nodes[index])}
        />
      ) : (
        <GraphRenderer
          graph={graph}
          layout={layout}
          readonly={readonly}
          showLaneLabels={showLaneLabels}
          onLayoutChange={onLayoutChange}
          onNodeClick={onNodeClick}
        />
      )}
    </div>
  );
};
