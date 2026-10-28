import type { EvolutionGraph } from "../../domain/evolutionGraph";
import type { LayoutRegion } from "../../layout";

export const MIN_ZOOM = 0.35;
export const FIT_MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2.5;

export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 88;

export const edgeClass = (type: EvolutionGraph["edges"][number]["type"]) => `graph-edge graph-edge--${type}`;

export const regionFor = (regions: LayoutRegion[], kind: LayoutRegion["kind"], id: string) =>
  regions.find((region) => region.kind === kind && region.id === id);
