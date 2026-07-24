import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import evolutionStore from '../stores/evolutionStore';
import EvolutionEditModal from '../components/EvolutionEditModal';
import { EvolutionContext } from './useEvolutionSteps';

export const EvolutionProvider: React.FC<{ children: React.ReactNode }> = observer(({ children }: { children: React.ReactNode }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <EvolutionContext.Provider value={{
      steps: evolutionStore.getSteps(),
      version: evolutionStore.version,
      modalOpen,
      toggleModal: setModalOpen,
      addStep: evolutionStore.addStep.bind(evolutionStore),
      updateStep: evolutionStore.updateStep.bind(evolutionStore),
      removeStep: evolutionStore.removeStep.bind(evolutionStore),
      resetToDefault: evolutionStore.resetToDefault.bind(evolutionStore),
      reorderSteps: evolutionStore.reorder.bind(evolutionStore),
    }}>
      {children}
      <EvolutionEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        steps={evolutionStore.getSteps()}
        addStep={evolutionStore.addStep.bind(evolutionStore)}
        updateStep={evolutionStore.updateStep.bind(evolutionStore)}
        removeStep={evolutionStore.removeStep.bind(evolutionStore)}
        resetToDefault={evolutionStore.resetToDefault.bind(evolutionStore)}
        reorderSteps={evolutionStore.reorder.bind(evolutionStore)}
      />
    </EvolutionContext.Provider>
  );
});
