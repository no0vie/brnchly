import React from 'react';
import evolutionStore from '../stores/evolutionStore';

export interface EvolutionContextType {
  steps: typeof evolutionStore.steps;
  version: number;
  modalOpen: boolean;
  toggleModal: (open: boolean) => void;
  addStep: typeof evolutionStore.addStep;
  updateStep: typeof evolutionStore.updateStep;
  removeStep: typeof evolutionStore.removeStep;
  resetToDefault: typeof evolutionStore.resetToDefault;
  reorderSteps: typeof evolutionStore.reorder;
}

export const EvolutionContext = React.createContext<EvolutionContextType | null>(null);

export const useEvolutionSteps = () => {
  const ctx = React.useContext(EvolutionContext);
  if (!ctx) throw new Error('useEvolutionSteps must be used within EvolutionProvider');
  return ctx;
};
