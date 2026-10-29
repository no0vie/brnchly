import { expect, it } from "vitest";
import { DEFAULT_EVOLUTION_VIEW_SETTINGS, type EvolutionGraphMode, type EvolutionLayoutStrategy } from "./viewSettings";

it("exposes graph mode and all Phase 2 layouts", () => {
  const mode: EvolutionGraphMode = "graph";
  const layouts: EvolutionLayoutStrategy[] = [
    "horizontal-dag",
    "vertical-dag",
    "radial",
    "radial-tree",
    "manual",
    "stage-lane",
  ];
  expect(mode).toBe("graph");
  expect(layouts).toHaveLength(6);
  expect(DEFAULT_EVOLUTION_VIEW_SETTINGS.mode).toBe("classic");
});
