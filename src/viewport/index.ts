import type { Bounds, LayoutRegion, Size } from "../layout";
import type { Position } from "../domain/evolutionGraph";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
export interface ZoomLimits {
  minZoom?: number;
  maxZoom?: number;
}
export interface FitOptions extends ZoomLimits {
  padding?: number;
}

const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

export const clampZoom = (zoom: number, limits: ZoomLimits = {}): number => {
  const min = finite(limits.minZoom ?? 0.1, 0.1);
  const max = Math.max(min, finite(limits.maxZoom ?? 4, 4));
  return Math.min(max, Math.max(min, finite(zoom, 1)));
};

export const createViewport = (size: Size, zoom = 1): Viewport => ({
  x: Math.max(0, finite(size.width, 0)) / 2,
  y: Math.max(0, finite(size.height, 0)) / 2,
  zoom: clampZoom(zoom),
});

export const worldToScreen = (point: Position, viewport: Viewport): Position => ({
  x: point.x * viewport.zoom + viewport.x,
  y: point.y * viewport.zoom + viewport.y,
});

export const screenToWorld = (point: Position, viewport: Viewport): Position => {
  const zoom = viewport.zoom > 0 && Number.isFinite(viewport.zoom) ? viewport.zoom : 1;
  return { x: (point.x - viewport.x) / zoom, y: (point.y - viewport.y) / zoom };
};

export const fitBounds = (bounds: Bounds, size: Size, options: FitOptions = {}): Viewport => {
  const width = Math.max(0, finite(size.width, 0));
  const height = Math.max(0, finite(size.height, 0));
  if (width === 0 || height === 0) return { x: 0, y: 0, zoom: 1 };
  if (bounds.width <= 0 || bounds.height <= 0) return createViewport({ width, height });
  const padding = Math.max(0, finite(options.padding ?? 24, 24));
  const availableWidth = Math.max(0, width - 2 * padding);
  const availableHeight = Math.max(0, height - 2 * padding);
  const zoom = clampZoom(Math.min(availableWidth / bounds.width, availableHeight / bounds.height), options);
  return {
    x: width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom,
  };
};

export const focusRegion = (region: LayoutRegion, size: Size, options: FitOptions = {}): Viewport =>
  fitBounds(region, size, options);
export const focusStage = (
  regions: LayoutRegion[],
  stageId: string,
  size: Size,
  options: FitOptions = {},
): Viewport | undefined => {
  const region = regions.find(({ kind, id }) => kind === "stage" && id === stageId);
  return region ? focusRegion(region, size, options) : undefined;
};
export const focusLane = (
  regions: LayoutRegion[],
  laneId: string,
  size: Size,
  options: FitOptions = {},
): Viewport | undefined => {
  const region = regions.find(({ kind, id }) => kind === "lane" && id === laneId);
  return region ? focusRegion(region, size, options) : undefined;
};

export const panViewport = (viewport: Viewport, delta: Position): Viewport => ({
  ...viewport,
  x: viewport.x + delta.x,
  y: viewport.y + delta.y,
});

export const zoomAt = (viewport: Viewport, zoom: number, screenAnchor: Position, limits: ZoomLimits = {}): Viewport => {
  const worldAnchor = screenToWorld(screenAnchor, viewport);
  const nextZoom = clampZoom(zoom, limits);
  return { x: screenAnchor.x - worldAnchor.x * nextZoom, y: screenAnchor.y - worldAnchor.y * nextZoom, zoom: nextZoom };
};

export const resizeViewport = (viewport: Viewport, oldSize: Size, newSize: Size): Viewport => {
  const oldCenter = { x: Math.max(0, oldSize.width) / 2, y: Math.max(0, oldSize.height) / 2 };
  const centerWorld = screenToWorld(oldCenter, viewport);
  return {
    x: Math.max(0, newSize.width) / 2 - centerWorld.x * viewport.zoom,
    y: Math.max(0, newSize.height) / 2 - centerWorld.y * viewport.zoom,
    zoom: viewport.zoom,
  };
};
