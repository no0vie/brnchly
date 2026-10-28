import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Select, Space, Tooltip } from "antd";
import { CompressOutlined, EyeOutlined, MinusOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { EvolutionGraph, EvolutionLayoutStrategy, EvolutionNode } from "../domain/evolutionGraph";
import { layoutGraph, type LayoutRegion, type Size } from "../layout";
import { routeEdges } from "../graph/routing";
import {
  clampZoom,
  createViewport,
  fitBounds,
  focusLane,
  focusStage,
  panViewport,
  resizeViewport,
  zoomAt,
  type Viewport,
} from "../viewport";
import "./GraphRenderer.css";

const MIN_ZOOM = 0.35;
const FIT_MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.5;

const NODE_WIDTH = 176;
const NODE_HEIGHT = 88;

export interface CameraTransitionOptions {
  duration?: number;
  easing?: "linear" | "easeInOut";
  signal?: AbortSignal;
}

export interface GraphRendererHandle {
  fitToView: (options?: CameraTransitionOptions) => void;
  resetView: (options?: CameraTransitionOptions) => void;
  focusStage: (stageId: string, options?: CameraTransitionOptions) => void;
  focusLane: (laneId: string, options?: CameraTransitionOptions) => void;
  focusNode: (nodeId: string, options?: CameraTransitionOptions) => void;
  setCamera: (viewport: Viewport, options?: CameraTransitionOptions) => void;
  getCamera: () => Viewport;
  cancelCameraTransition: () => void;
}

export interface GraphRendererProps {
  graph: EvolutionGraph;
  layout: EvolutionLayoutStrategy;
  readonly?: boolean;
  showLaneLabels?: boolean;
  onNodeClick?: (node: EvolutionNode) => void;
  onNodeSelectionChange?: (nodeId: string | undefined) => void;
  onLayoutChange?: (layout: EvolutionLayoutStrategy) => void;
  onManualCameraInteraction?: () => void;
  visibleNodeIds?: ReadonlySet<string>;
  visibleEdgeIds?: ReadonlySet<string>;
  newNodeIds?: ReadonlySet<string>;
  activeStageId?: string | null;
  highlightedNodeIds?: ReadonlySet<string>;
  highlightedEdgeIds?: ReadonlySet<string>;
  highlightedLaneIds?: ReadonlySet<string>;
}

const edgeClass = (type: EvolutionGraph["edges"][number]["type"]) => `graph-edge graph-edge--${type}`;
const regionFor = (regions: LayoutRegion[], kind: LayoutRegion["kind"], id: string) =>
  regions.find((region) => region.kind === kind && region.id === id);

const GraphNodeCard = memo(function GraphNodeCard({
  node,
  color,
  position,
  size,
  selected,
  newlyRevealed,
  highlighted,
  dimmed,
  onSelect,
}: {
  node: EvolutionNode;
  color: string;
  position: { x: number; y: number };
  size: Size;
  selected: boolean;
  newlyRevealed: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onSelect: (node: EvolutionNode) => void;
}) {
  return (
    <button
      type="button"
      className={`universal-node universal-node--${node.status}${selected ? " universal-node--selected" : ""}${newlyRevealed ? " universal-node--new" : ""}${highlighted ? " is-highlighted" : ""}${dimmed ? " is-dimmed" : ""}`}
      style={
        {
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          "--lane-color": color,
        } as React.CSSProperties
      }
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node);
      }}
      aria-label={`${node.title}. Status: ${node.status}`}
      title={node.description}
    >
      <span className="universal-node__icon" aria-hidden="true">
        {node.icon ?? "◆"}
      </span>
      <span className="universal-node__body">
        <strong>{node.title}</strong>
        {node.description && <small>{node.description}</small>}
      </span>
      <span className="universal-node__status">{node.status}</span>
    </button>
  );
});

export const GraphRenderer = forwardRef<GraphRendererHandle, GraphRendererProps>(function GraphRenderer(
  {
    graph,
    layout,
    showLaneLabels = true,
    onNodeClick,
    onNodeSelectionChange,
    onLayoutChange,
    onManualCameraInteraction,
    visibleNodeIds,
    visibleEdgeIds,
    newNodeIds,
    activeStageId: playbackStageId,
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
  const viewportRef = useRef<Viewport>(createViewport({ width: 1000, height: 640 }));
  const [size, setSize] = useState<Size>({ width: 1000, height: 640 });
  const [viewport, setViewportState] = useState<Viewport>(viewportRef.current);
  const setViewport = useCallback((next: Viewport | ((current: Viewport) => Viewport)) => {
    setViewportState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      viewportRef.current = value;
      return value;
    });
  }, []);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [activeStageId, setActiveStageId] = useState<string>();
  const [activeLaneId, setActiveLaneId] = useState<string>();

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
    fit();
  }, [fit]);
  useEffect(() => {
    setSelectedNodeId(undefined);
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
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) lastPinchDistance.current = undefined;
  };

  const selectNode = useCallback(
    (node: EvolutionNode) => {
      setSelectedNodeId(node.id);
      onNodeSelectionChange?.(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick, onNodeSelectionChange],
  );

  const worldTransform = `translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`;
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;
  const routes = useMemo(
    () =>
      routeEdges(graph.edges, result.positions, result.nodeSize, layout === "vertical-dag" ? "vertical" : "horizontal"),
    [graph.edges, layout, result.nodeSize, result.positions],
  );
  const edgeById = useMemo(() => new Map(graph.edges.map((edge) => [edge.id, edge])), [graph.edges]);
  const hasHighlight = Boolean(highlightedNodeIds?.size || highlightedLaneIds?.size);

  return (
    <section className="graph-mode" aria-label={`${graph.title} graph`}>
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
              onChange={(id) => (id ? focusStageById(id) : clearFocus())}
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
              onChange={(id) => (id ? focusLaneById(id) : clearFocus())}
              options={lanes.map((lane) => ({ value: lane.id, label: lane.title }))}
              style={{ width: 150 }}
            />
          )}
          <Tooltip title="Zoom out">
            <Button aria-label="Zoom out" icon={<MinusOutlined />} onClick={() => zoom(0.85)} />
          </Tooltip>
          <Tooltip title="Zoom in">
            <Button aria-label="Zoom in" icon={<PlusOutlined />} onClick={() => zoom(1.15)} />
          </Tooltip>
          <Tooltip title="Fit to view">
            <Button aria-label="Fit to view" icon={<CompressOutlined />} onClick={() => fit()} />
          </Tooltip>
          <Tooltip title="Reset view">
            <Button aria-label="Reset view" icon={<ReloadOutlined />} onClick={() => reset()} />
          </Tooltip>
          <span className="graph-toolbar__zoom">{Math.round(viewport.zoom * 100)}%</span>
        </Space>
        <div className="graph-legend" aria-label="Edge legend">
          <span className="graph-legend__dependency">→ dependency</span>
          <span className="graph-legend__evolution">→ evolution</span>
          <span className="graph-legend__related">— related</span>
        </div>
      </div>

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
            {routes.map((route) => {
              const edge = edgeById.get(route.id)!;
              if (visibleEdgeIds && !visibleEdgeIds.has(edge.id)) return null;
              const sourceLaneId = nodeById.get(edge.source)?.laneId;
              const targetLaneId = nodeById.get(edge.target)?.laneId;
              const laneHighlighted =
                (sourceLaneId !== undefined && highlightedLaneIds?.has(sourceLaneId)) ||
                (targetLaneId !== undefined && highlightedLaneIds?.has(targetLaneId));
              const highlighted = (highlightedEdgeIds?.has(edge.id) ?? false) || Boolean(laneHighlighted);
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
                  position={result.positions[node.id]}
                  size={result.nodeSize}
                  selected={selectedNodeId === node.id}
                  newlyRevealed={newNodeIds?.has(node.id) ?? false}
                  highlighted={highlightedNodeIds?.has(node.id) ?? highlightedLaneIds?.has(node.laneId ?? "") ?? false}
                  dimmed={
                    hasHighlight &&
                    !(highlightedNodeIds?.has(node.id) ?? false) &&
                    !(highlightedLaneIds?.has(node.laneId ?? "") ?? false)
                  }
                  onSelect={selectNode}
                />
              ),
          )}
        </div>

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
              onClick={() => {
                setSelectedNodeId(undefined);
                onNodeSelectionChange?.(undefined);
              }}
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
