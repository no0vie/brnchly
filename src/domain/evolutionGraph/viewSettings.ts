export type EvolutionGraphMode = 'classic' | 'evolution' | 'skill-tree';
export type EvolutionGraphTheme = 'dark' | 'light';
export type EvolutionLayoutStrategy = 'horizontal-dag' | 'vertical-dag' | 'radial-tree' | 'manual';

export interface EvolutionViewSettings {
  mode: EvolutionGraphMode;
  theme: EvolutionGraphTheme;
  layout: EvolutionLayoutStrategy;
  autoplay: boolean;
  playbackSpeed: number;
  activeBranchId?: string;
}

export const DEFAULT_EVOLUTION_VIEW_SETTINGS: Readonly<EvolutionViewSettings> = {
  mode: 'classic',
  theme: 'dark',
  layout: 'horizontal-dag',
  autoplay: false,
  playbackSpeed: 1,
};
