import { describe, expect, it } from "vitest";
import {
  clampZoom,
  createViewport,
  fitBounds,
  focusRegion,
  panViewport,
  resizeViewport,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from "./index";

const region = { id: "stage", kind: "stage" as const, x: 100, y: 50, width: 400, height: 200 };

describe("viewport math", () => {
  it("clamps zoom and safely fits empty or non-positive viewports", () => {
    expect(clampZoom(0.01, { minZoom: 0.25, maxZoom: 4 })).toBe(0.25);
    expect(clampZoom(10, { minZoom: 0.25, maxZoom: 4 })).toBe(4);
    expect(fitBounds({ x: 0, y: 0, width: 0, height: 0 }, { width: 800, height: 600 })).toEqual({
      x: 400,
      y: 300,
      zoom: 1,
    });
    expect(fitBounds(region, { width: 0, height: 0 })).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("fits bounds with padding and centers them", () => {
    const viewport = fitBounds(region, { width: 1000, height: 600 }, { padding: 100 });
    expect(viewport.zoom).toBe(2);
    expect(worldToScreen({ x: 300, y: 150 }, viewport)).toEqual({ x: 500, y: 300 });
  });

  it("round-trips transforms and keeps an anchor fixed while zooming", () => {
    const state = { x: 20, y: 30, zoom: 2 };
    const world = { x: 12, y: -4 };
    expect(screenToWorld(worldToScreen(world, state), state)).toEqual(world);

    const anchor = { x: 250, y: 180 };
    const before = screenToWorld(anchor, state);
    const zoomed = zoomAt(state, 3, anchor);
    expect(screenToWorld(anchor, zoomed)).toEqual(before);
  });

  it("pans immutably and focuses stage/lane regions", () => {
    const state = createViewport({ width: 800, height: 600 });
    expect(panViewport(state, { x: 10, y: -20 })).toEqual({ x: 410, y: 280, zoom: 1 });
    expect(focusRegion(region, { width: 800, height: 600 })).toEqual(fitBounds(region, { width: 800, height: 600 }));
  });

  it("resizes safely while preserving the world point at the old center", () => {
    const state = { x: 100, y: 80, zoom: 2 };
    const resized = resizeViewport(state, { width: 400, height: 300 }, { width: 900, height: 500 });
    const oldCenterWorld = screenToWorld({ x: 200, y: 150 }, state);
    expect(screenToWorld({ x: 450, y: 250 }, resized)).toEqual(oldCenterWorld);
  });
});
