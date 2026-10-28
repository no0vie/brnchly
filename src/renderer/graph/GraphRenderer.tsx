import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import type { EvolutionNode } from "../../domain/evolutionGraph";
import { layoutGraph, type Size } from "../../layout";
import { routeEdges } from "../../graph/routing";
import { createGraphIndex, traverseGraph } from "../../graph/traversal";
import {
  clampZoom,
  createViewport,
  fitBounds,
  focusLane,
  focusStage,
  panViewport,
  resizeViewport,
  screenToWorld,
  zoomAt,
  type Viewport,
} from "../../viewport";
import { FIT_MIN_ZOOM, MAX_ZOOM, MIN_ZOOM, NODE_HEIGHT, NODE_WIDTH, edgeClass, regionFor } from "./constants";
import { GraphNodeCard } from "./GraphNodeCard";
import { GraphToolbar } from "./GraphToolbar";
import type { CameraTransitionOptions, GraphRendererHandle, GraphRendererProps } from "./types";
import "../GraphRenderer.css";

export type { CameraTransitionOptions, GraphHighlightState, GraphRendererHandle, GraphRendererProps } from "./types";

export const GraphRenderer = forwardRef<GraphRendererHandle, GraphRendererProps>(function GraphRenderer(
  {
    graph,
    layout,
    showLaneLabels = true,
    onNodeClick,
    editingEnabled = false,
    selectedNodeIds,
    onNodePositionCommit,
    onConnectionCommit,
    selectedNodeId: controlledSelectedNodeId,
    defaultSelectedNodeId = null,
    onSelectedNodeChange,
    onNodeSelectionChange,
    camera,
    defaultCamera,
    onCameraChange,
    onLayoutChange,
    onManualCameraInteraction,
    visibleNodeIds,
    visibleEdgeIds,
    newNodeIds,
    activeStageId: playbackStageId,
    highlightState,
    highlightedNodeIds,
    highlightedEdgeIds,
    highlightedLaneIds,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerPrefix = useId().replace(/:/g, "");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDistance = useRef<number>();
  const cameraFrame = useRef<number>();
  const initialViewport = useRef(defaultCamera ?? createViewport({ width: 1000, height: 640 }));
  const viewportRef = useRef<Viewport>(camera ?? initialViewport.current);
  const cameraControlled = camera !== undefined;
  viewportRef.current = camera ?? viewportRef.current;
  const [size, setSize] = useState<Size>({ width: 1000, height: 640 });
  const [uncontrolledViewport, setUncontrolledViewport] = useState<Viewport>(initialViewport.current);
  const viewport = camera ?? uncontrolledViewport;
  const sameViewport = (left: Viewport, right: Viewport) =>
    left.x === right.x && left.y === right.y && left.zoom === right.zoom;
  const setViewport = useCallback(
    (next: Viewport | ((current: Viewport) => Viewport)) => {
      const current = viewportRef.current;
      const value = typeof next === "function" ? next(current) : next;
      if (sameViewport(current, value)) return;
      if (!cameraControlled) {
        viewportRef.current = value;
        setUncontrolledViewport(value);
      }
      onCameraChange?.(value);
    },
    [cameraControlled, onCameraChange],
  );
  const selectionControlled = controlledSelectedNodeId !== undefined;
  const [uncontrolledSelectedNodeId, setUncontrolledSelectedNodeId] = useState<string | null>(defaultSelectedNodeId);
  const selectedNodeId = selectionControlled ? controlledSelectedNodeId : uncontrolledSelectedNodeId;
  const [activeStageId, setActiveStageId] = useState<string>();
  const [activeLaneId, setActiveLaneId] = useState<string>();
  const dragRef = useRef<{
    pointerId: number;
    nodeId: string;
    startClient: { x: number; y: number };
    startPositions: Record<string, { x: number; y: number }>;
  }>();
  const [dragPreview, setDragPreview] = useState<Record<string, { x: number; y: number }>>({});
  const [connection, setConnection] = useState<{ sourceId: string; pointer: { x: number; y: number } }>();

  const result = useMemo(
    () =>
      layoutGraph(graph, {
        strategy: layout,
        nodeSize: { width: NODE_WIDTH, height: NODE_HEIGHT },
        nodeGap: 28,
        layerGap: 104,
        headerSize: 64,
      }),
    [graph, layout],
  );

  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const traversalIndex = useMemo(
    () =>
      createGraphIndex(
        graph.edges,
        graph.nodes.map(({ id }) => id),
      ),
    [graph.edges, graph.nodes],
  );
  const explicitHighlight = useMemo(
    () =>
      highlightState?.rootNodeId
        ? traverseGraph(traversalIndex, highlightState.rootNodeId, highlightState.traversalMode)
        : undefined,
    [highlightState?.rootNodeId, highlightState?.traversalMode, traversalIndex],
  );
  const effectiveHighlightedNodeIds = explicitHighlight ? new Set(explicitHighlight.nodeIds) : highlightedNodeIds;
  const effectiveHighlightedEdgeIds = explicitHighlight ? new Set(explicitHighlight.edgeIds) : highlightedEdgeIds;
  const effectiveHighlightedLaneIds = highlightState?.selectedLaneIds ?? highlightedLaneIds;
  const laneById = useMemo(() => new Map((graph.lanes ?? []).map((lane) => [lane.id, lane])), [graph.lanes]);
  const stages = useMemo(
    () => [...(graph.stages ?? [])].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    [graph.stages],
  );
  const lanes = useMemo(
    () => [...(graph.lanes ?? [])].sort((a, b) => a.coordinate - b.coordinate || a.id.localeCompare(b.id)),
    [graph.lanes],
  );

  const clearFocus = useCallback(() => {
    setActiveStageId(undefined);
    setActiveLaneId(undefined);
  }, []);
  const cancelCameraTransition = useCallback(() => {
    if (cameraFrame.current !== undefined) cancelAnimationFrame(cameraFrame.current);
    cameraFrame.current = undefined;
  }, []);
  const moveCamera = useCallback(
    (target: Viewport, options: CameraTransitionOptions = {}) => {
      cancelCameraTransition();
      const duration = Math.max(0, options.duration ?? 0);
      if (duration === 0 || options.signal?.aborted) {
        if (!options.signal?.aborted) setViewport(target);
        return;
      }
      const start = viewportRef.current;
      const startedAt = performance.now();
      const update = (now: number) => {
        if (options.signal?.aborted) return cancelCameraTransition();
        const raw = Math.min(1, (now - startedAt) / duration);
        const amount =
          options.easing === "linear" ? raw : raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
        setViewport({
          x: start.x + (target.x - start.x) * amount,
          y: start.y + (target.y - start.y) * amount,
          zoom: start.zoom + (target.zoom - start.zoom) * amount,
        });
        if (raw < 1) cameraFrame.current = requestAnimationFrame(update);
        else cameraFrame.current = undefined;
      };
      cameraFrame.current = requestAnimationFrame(update);
    },
    [cancelCameraTransition, setViewport],
  );
  const fit = useCallback(
    (options?: CameraTransitionOptions) => {
      moveCamera(fitBounds(result.bounds, size, { padding: 42, minZoom: FIT_MIN_ZOOM, maxZoom: 1.25 }), options);
      clearFocus();
    },
    [clearFocus, moveCamera, result.bounds, size],
  );
  const reset = useCallback(
    (options?: CameraTransitionOptions) => {
      moveCamera(createViewport(size), options);
      clearFocus();
    },
    [clearFocus, moveCamera, size],
  );
  const focusStageById = useCallback(
    (stageId: string, options?: CameraTransitionOptions) => {
      const next = focusStage(result.regions, stageId, size, { padding: 32, minZoom: MIN_ZOOM, maxZoom: 1.2 });
      if (next) {
        moveCamera(next, options);
        setActiveStageId(stageId);
        setActiveLaneId(undefined);
      }
    },
    [moveCamera, result.regions, size],
  );
  const focusLaneById = useCallback(
    (laneId: string, options?: CameraTransitionOptions) => {
      const next = focusLane(result.regions, laneId, size, { padding: 32, minZoom: MIN_ZOOM, maxZoom: 1.2 });
      if (next) {
        moveCamera(next, options);
        setActiveLaneId(laneId);
        setActiveStageId(undefined);
      }
    },
    [moveCamera, result.regions, size],
  );

  useImperativeHandle(
    ref,
    () => ({
      fitToView: fit,
      resetView: reset,
      focusStage: focusStageById,
      focusLane: focusLaneById,
      focusNode: (nodeId, options) => {
        const position = result.positions[nodeId];
        if (position)
          moveCamera(
            fitBounds({ ...position, ...result.nodeSize }, size, { padding: 100, minZoom: MIN_ZOOM, maxZoom: 1.35 }),
            options,
          );
      },
      setCamera: (next, options) =>
        moveCamera(
          {
            x: Number.isFinite(next.x) ? next.x : 0,
            y: Number.isFinite(next.y) ? next.y : 0,
            zoom: clampZoom(next.zoom, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }),
          },
          options,
        ),
      getCamera: () => viewportRef.current,
      cancelCameraTransition,
    }),
    [
      cancelCameraTransition,
      fit,
      focusLaneById,
      focusStageById,
      moveCamera,
      reset,
      result.nodeSize,
      result.positions,
      size,
    ],
  );

  useEffect(() => () => cancelCameraTransition(), [cancelCameraTransition]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      if (next.width <= 0 || next.height <= 0) return;
      setSize((previous) => {
        setViewport((current) => resizeViewport(current, previous, next));
        return next;
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [setViewport]);

  useEffect(() => {
    if (camera === undefined && defaultCamera === undefined) fit();
  }, [camera, defaultCamera, fit]);
  useEffect(() => {
    clearFocus();
  }, [clearFocus, graph.id]);

  const beginManualInteraction = useCallback(() => {
    cancelCameraTransition();
    clearFocus();
    onManualCameraInteraction?.();
  }, [cancelCameraTransition, clearFocus, onManualCameraInteraction]);

  const zoom = useCallback(
    (factor: number, anchor = { x: size.width / 2, y: size.height / 2 }) => {
      beginManualInteraction();
      setViewport((current) =>
        zoomAt(current, current.zoom * factor, anchor, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }),
      );
    },
    [beginManualInteraction, setViewport, size],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, [role='combobox']")) return;
    beginManualInteraction();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const delta = {
        x: (event.clientX - drag.startClient.x) / viewportRef.current.zoom,
        y: (event.clientY - drag.startClient.y) / viewportRef.current.zoom,
      };
      setDragPreview(
        Object.fromEntries(
          Object.entries(drag.startPositions).map(([id, position]) => [
            id,
            { x: position.x + delta.x, y: position.y + delta.y },
          ]),
        ),
      );
      return;
    }
    if (connection) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect)
        setConnection(
          (current) =>
            current && {
              ...current,
              pointer: screenToWorld(
                { x: event.clientX - rect.left, y: event.clientY - rect.top },
                viewportRef.current,
              ),
            },
        );
      return;
    }
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      setViewport((current) => panViewport(current, { x: event.clientX - previous.x, y: event.clientY - previous.y }));
      return;
    }
    const [first, second] = [...pointers.current.values()];
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    const rect = containerRef.current?.getBoundingClientRect();
    if (lastPinchDistance.current && rect) {
      const anchor = { x: (first.x + second.x) / 2 - rect.left, y: (first.y + second.y) / 2 - rect.top };
      setViewport((current) =>
        zoomAt(current, (current.zoom * distance) / lastPinchDistance.current!, anchor, {
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
        }),
      );
    }
    lastPinchDistance.current = distance;
  };
  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setConnection(undefined);
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const position = dragPreview[drag.nodeId];
      dragRef.current = undefined;
      setDragPreview({});
      if (position) onNodePositionCommit?.(drag.nodeId, position);
      return;
    }
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) lastPinchDistance.current = undefined;
  };

  const startNodeDrag = useCallback(
    (event: React.PointerEvent, node: EvolutionNode) => {
      if (!editingEnabled || layout !== "manual" || event.button !== 0) return;
      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      const ids = selectedNodeIds?.has(node.id) ? [...selectedNodeIds] : [node.id];
      dragRef.current = {
        pointerId: event.pointerId,
        nodeId: node.id,
        startClient: { x: event.clientX, y: event.clientY },
        startPositions: Object.fromEntries(
          ids.filter((id) => result.positions[id]).map((id) => [id, result.positions[id]]),
        ),
      };
    },
    [editingEnabled, layout, result.positions, selectedNodeIds],
  );

  const beginConnection = useCallback(
    (sourceId: string) => {
      if (!editingEnabled) return;
      const source = result.positions[sourceId];
      if (!source) return;
      setConnection({
        sourceId,
        pointer: { x: source.x + result.nodeSize.width, y: source.y + result.nodeSize.height / 2 },
      });
    },
    [editingEnabled, result.nodeSize, result.positions],
  );
  const startConnection = useCallback(
    (event: React.PointerEvent, sourceId: string) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      beginConnection(sourceId);
    },
    [beginConnection],
  );
  const startConnectionKeyDown = useCallback(
    (event: React.KeyboardEvent, sourceId: string) => {
      if (event.key === "Escape") {
        setConnection(undefined);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      beginConnection(sourceId);
    },
    [beginConnection],
  );
  const finishConnection = useCallback(
    (targetId: string) => {
      if (connection && connection.sourceId !== targetId) onConnectionCommit?.(connection.sourceId, targetId);
      setConnection(undefined);
    },
    [connection, onConnectionCommit],
  );
  const commitConnection = useCallback(
    (event: React.PointerEvent, targetId: string) => {
      event.stopPropagation();
      finishConnection(targetId);
    },
    [finishConnection],
  );
  const commitConnectionKeyDown = useCallback(
    (event: React.KeyboardEvent, targetId: string) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setConnection(undefined);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      finishConnection(targetId);
    },
    [finishConnection],
  );

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dragRef.current = undefined;
      setDragPreview({});
      setConnection(undefined);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);

  const changeSelection = useCallback(
    (nodeId: string | null) => {
      if (!selectionControlled) setUncontrolledSelectedNodeId(nodeId);
      onSelectedNodeChange?.(nodeId);
      onNodeSelectionChange?.(nodeId ?? undefined);
    },
    [onNodeSelectionChange, onSelectedNodeChange, selectionControlled],
  );
  const selectNode = useCallback(
    (node: EvolutionNode) => {
      changeSelection(node.id);
      onNodeClick?.(node);
    },
    [changeSelection, onNodeClick],
  );

  const worldTransform = `translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`;
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;
  const displayedPositions = useMemo(() => ({ ...result.positions, ...dragPreview }), [dragPreview, result.positions]);
  const routes = useMemo(
    () =>
      routeEdges(
        graph.edges,
        displayedPositions,
        result.nodeSize,
        layout === "vertical-dag" ? "vertical" : "horizontal",
      ),
    [displayedPositions, graph.edges, layout, result.nodeSize],
  );
  const edgeById = useMemo(() => new Map(graph.edges.map((edge) => [edge.id, edge])), [graph.edges]);
  const hasHighlight = Boolean(effectiveHighlightedNodeIds?.size || effectiveHighlightedLaneIds?.size);

  return (
    <section className="graph-mode" aria-label={`${graph.title} graph`}>
      <GraphToolbar
        layout={layout}
        stages={stages}
        lanes={lanes}
        activeStageId={activeStageId}
        activeLaneId={activeLaneId}
        zoom={viewport.zoom}
        onLayoutChange={onLayoutChange}
        onFocusStage={focusStageById}
        onFocusLane={focusLaneById}
        onClearFocus={clearFocus}
        onZoom={zoom}
        onFit={fit}
        onReset={reset}
      />

      <div
        ref={containerRef}
        className="graph-viewport"
        onWheel={(event) => {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          zoom(event.deltaY < 0 ? 1.12 : 0.89, { x: event.clientX - rect.left, y: event.clientY - rect.top });
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onDoubleClick={() => fit()}
      >
        <svg className="graph-canvas" width="100%" height="100%" role="img" aria-label="Interactive evolution graph">
          <defs>
            <marker
              id={`${markerPrefix}-dependency`}
              className="graph-marker graph-marker--dependency"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" />
            </marker>
            <marker
              id={`${markerPrefix}-evolution`}
              className="graph-marker graph-marker--evolution"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" />
            </marker>
          </defs>
          <g transform={worldTransform}>
            {layout === "stage-lane" &&
              result.regions.map((region) => (
                <rect
                  key={`${region.kind}-${region.id}`}
                  className={`graph-region graph-region--${region.kind}`}
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                />
              ))}
            {connection &&
              (() => {
                const source = displayedPositions[connection.sourceId];
                if (!source) return null;
                const start = { x: source.x + result.nodeSize.width, y: source.y + result.nodeSize.height / 2 };
                return (
                  <path
                    className="graph-connection-preview"
                    d={`M ${start.x} ${start.y} L ${connection.pointer.x} ${connection.pointer.y}`}
                  />
                );
              })()}
            {routes.map((route) => {
              const edge = edgeById.get(route.id)!;
              if (visibleEdgeIds && !visibleEdgeIds.has(edge.id)) return null;
              const sourceLaneId = nodeById.get(edge.source)?.laneId;
              const targetLaneId = nodeById.get(edge.target)?.laneId;
              const laneHighlighted =
                (sourceLaneId !== undefined && effectiveHighlightedLaneIds?.has(sourceLaneId)) ||
                (targetLaneId !== undefined && effectiveHighlightedLaneIds?.has(targetLaneId));
              const highlighted = (effectiveHighlightedEdgeIds?.has(edge.id) ?? false) || Boolean(laneHighlighted);
              return (
                <path
                  key={edge.id}
                  data-edge-id={edge.id}
                  className={`${edgeClass(edge.type)}${highlighted ? " is-highlighted" : ""}${hasHighlight && !highlighted ? " is-dimmed" : ""}`}
                  d={route.path}
                  markerEnd={edge.type === "related" ? undefined : `url(#${markerPrefix}-${edge.type})`}
                />
              );
            })}
          </g>
        </svg>

        <div
          className="graph-world"
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
        >
          {graph.nodes.map(
            (node) =>
              result.positions[node.id] &&
              (!visibleNodeIds || visibleNodeIds.has(node.id)) && (
                <GraphNodeCard
                  key={node.id}
                  node={node}
                  color={
                    laneById.get(node.laneId ?? "")?.color ??
                    graph.branches.find((branch) => branch.id === node.branchId)?.color ??
                    "#7c8cff"
                  }
                  position={displayedPositions[node.id]}
                  size={result.nodeSize}
                  selected={selectedNodeId === node.id || Boolean(selectedNodeIds?.has(node.id))}
                  newlyRevealed={newNodeIds?.has(node.id) ?? false}
                  highlighted={
                    effectiveHighlightedNodeIds?.has(node.id) ??
                    effectiveHighlightedLaneIds?.has(node.laneId ?? "") ??
                    false
                  }
                  dimmed={
                    hasHighlight &&
                    !(effectiveHighlightedNodeIds?.has(node.id) ?? false) &&
                    !(effectiveHighlightedLaneIds?.has(node.laneId ?? "") ?? false)
                  }
                  editingEnabled={editingEnabled}
                  connectionSource={connection?.sourceId === node.id}
                  connectionTarget={Boolean(connection && connection.sourceId !== node.id)}
                  onSelect={selectNode}
                  onDragStart={startNodeDrag}
                  onConnectionStart={startConnection}
                  onConnectionStartKeyDown={startConnectionKeyDown}
                  onConnectionTarget={commitConnection}
                  onConnectionTargetKeyDown={commitConnectionKeyDown}
                />
              ),
          )}
        </div>

        {connection && (
          <div role="status" className="sr-only">
            Connecting from {nodeById.get(connection.sourceId)?.title ?? connection.sourceId}
          </div>
        )}

        {layout === "stage-lane" && (
          <>
            <div className="stage-header" aria-label="Stages">
              {stages.map((stage) => {
                const region = regionFor(result.regions, "stage", stage.id);
                if (!region) return null;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    aria-pressed={activeStageId === stage.id || playbackStageId === stage.id}
                    className={`${activeStageId === stage.id || playbackStageId === stage.id ? "is-active" : ""}${playbackStageId && playbackStageId !== stage.id ? " is-pending" : ""}`}
                    style={{ left: viewport.x + region.x * viewport.zoom, width: region.width * viewport.zoom }}
                    onClick={() => focusStageById(stage.id)}
                    title={stage.description}
                  >
                    {stage.title}
                  </button>
                );
              })}
            </div>
            {showLaneLabels && (
              <div className="lane-labels" aria-label="Lanes">
                {lanes.map((lane) => {
                  const region = regionFor(result.regions, "lane", lane.id);
                  if (!region) return null;
                  return (
                    <button
                      key={lane.id}
                      type="button"
                      aria-pressed={activeLaneId === lane.id}
                      className={activeLaneId === lane.id ? "is-active" : ""}
                      style={
                        {
                          top: viewport.y + region.y * viewport.zoom,
                          height: region.height * viewport.zoom,
                          "--lane-color": lane.color ?? "#7c8cff",
                        } as React.CSSProperties
                      }
                      onClick={() => focusLaneById(lane.id)}
                    >
                      <span>{lane.title}</span>
                      <small>{lane.coordinate}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {selectedNode && (
          <aside className="node-details" aria-live="polite">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              onClick={() => changeSelection(null)}
              aria-label="Close node details"
            />
            <strong>
              {selectedNode.icon} {selectedNode.title}
            </strong>
            <p>{selectedNode.description ?? "No description"}</p>
            <span>{selectedNode.status}</span>
          </aside>
        )}
      </div>
    </section>
  );
});
