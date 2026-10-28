import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Select, Space } from "antd";
import SporeGraphAntd from "../components/SporeGraphAntd";
import { GraphRenderer, type GraphRendererHandle } from "./GraphRenderer";
import { PlaybackControls } from "../components/playback/PlaybackControls";
import { usePlayback } from "../components/playback/usePlayback";
import { useReducedMotion } from "../components/playback/useReducedMotion";
import { createGraphIndex, traverseGraph, type TraversalMode } from "../graph/traversal";
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
  const rendererRef = useRef<GraphRendererHandle>(null);
  const reducedMotion = useReducedMotion();
  const [evolutionMode, setEvolutionMode] = useState(autoplay);
  const [cameraMode, setCameraMode] = useState<"follow" | "overview" | "manual">("follow");
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [traversalMode, setTraversalMode] = useState<TraversalMode>("direct");
  const [laneIds, setLaneIds] = useState<string[]>([]);
  const playback = usePlayback(graph, { autoplay, cameraMode });
  const traversalIndex = useMemo(
    () =>
      createGraphIndex(
        graph.edges,
        graph.nodes.map(({ id }) => id),
      ),
    [graph.edges, graph.nodes],
  );
  const traversal = useMemo(
    () => (selectedNodeId ? traverseGraph(traversalIndex, selectedNodeId, traversalMode) : undefined),
    [selectedNodeId, traversalIndex, traversalMode],
  );
  const activeStage = graph.stages?.find(({ id }) => id === playback.snapshot.activeStageId);

  useEffect(() => {
    if (!evolutionMode || cameraMode === "manual") return;
    const options = { duration: reducedMotion ? 0 : 480, easing: "easeInOut" as const };
    if (cameraMode === "overview") rendererRef.current?.fitToView(options);
    else if (playback.snapshot.activeStageId) rendererRef.current?.focusStage(playback.snapshot.activeStageId, options);
  }, [cameraMode, evolutionMode, playback.snapshot.activeStageId, reducedMotion]);

  useEffect(() => {
    setSelectedNodeId(undefined);
    setLaneIds([]);
  }, [graph.id]);

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
        <>
          <div className="evolution-tools">
            <Space wrap size="small">
              <Button aria-pressed={evolutionMode} onClick={() => setEvolutionMode((current) => !current)}>
                {evolutionMode ? "Graph Mode" : "Evolution Mode"}
              </Button>
              {evolutionMode && (
                <Select
                  aria-label="Camera mode"
                  value={cameraMode}
                  onChange={setCameraMode}
                  options={[
                    { value: "follow", label: "Follow camera" },
                    { value: "overview", label: "Overview camera" },
                    { value: "manual", label: "Manual camera" },
                  ]}
                />
              )}
              {selectedNodeId && (
                <Select
                  aria-label="Dependency highlight mode"
                  value={traversalMode}
                  onChange={setTraversalMode}
                  options={["direct", "upstream", "downstream", "both", "related"].map((value) => ({
                    value,
                    label: value[0].toUpperCase() + value.slice(1),
                  }))}
                />
              )}
              {(graph.lanes?.length ?? 0) > 0 && (
                <Select
                  mode="multiple"
                  allowClear
                  aria-label="Highlight lanes"
                  placeholder="Highlight lanes"
                  value={laneIds}
                  onChange={setLaneIds}
                  options={graph.lanes?.map(({ id, title }) => ({ value: id, label: title }))}
                  style={{ minWidth: 170 }}
                />
              )}
              {laneIds.length === 1 && (
                <Button
                  onClick={() => rendererRef.current?.focusLane(laneIds[0], { duration: reducedMotion ? 0 : 420 })}
                >
                  Focus lane
                </Button>
              )}
            </Space>
            {evolutionMode && (
              <PlaybackControls
                snapshot={playback.snapshot}
                speed={playback.speed}
                stageTitle={activeStage?.title}
                onPlay={playback.play}
                onPause={playback.pause}
                onRestart={playback.restart}
                onPreviousStage={playback.previousStage}
                onNextStage={playback.nextStage}
                onSeek={playback.seek}
                onSpeedChange={playback.setSpeed}
              />
            )}
          </div>
          <GraphRenderer
            ref={rendererRef}
            graph={graph}
            layout={layout}
            readonly={readonly}
            showLaneLabels={showLaneLabels}
            onLayoutChange={onLayoutChange}
            onManualCameraInteraction={() => evolutionMode && setCameraMode("manual")}
            visibleNodeIds={evolutionMode ? new Set(playback.snapshot.visibleNodeIds) : undefined}
            visibleEdgeIds={evolutionMode ? new Set(playback.snapshot.visibleEdgeIds) : undefined}
            newNodeIds={evolutionMode ? new Set(playback.snapshot.newlyVisibleNodeIds) : undefined}
            activeStageId={evolutionMode ? playback.snapshot.activeStageId : undefined}
            highlightedNodeIds={traversal ? new Set(traversal.nodeIds) : undefined}
            highlightedEdgeIds={traversal ? new Set(traversal.edgeIds) : undefined}
            highlightedLaneIds={laneIds.length ? new Set(laneIds) : undefined}
            onNodeSelectionChange={setSelectedNodeId}
            onNodeClick={onNodeClick}
          />
        </>
      )}
    </div>
  );
};
