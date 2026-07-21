import { makeAutoObservable, runInAction } from 'mobx';
import type { EvolutionStep } from '../types';
import { defaultEvolutionSteps } from '../data/sampleData';

class EvolutionStore {
  steps: EvolutionStep[];
  modalOpen: boolean;

  constructor() {
    this.steps = [...defaultEvolutionSteps];
    this.modalOpen = false;
    makeAutoObservable(this);
  }

  openModal() {
    runInAction(() => { this.modalOpen = true; });
  }

  closeModal() {
    runInAction(() => { this.modalOpen = false; });
  }

  toggleModal(open: boolean) {
    runInAction(() => { this.modalOpen = open; });
  }

  getModalOpen(): boolean {
    return this.modalOpen;
  }

  getSteps(): EvolutionStep[] {
    return this.steps;
  }

  addStep(step: EvolutionStep) {
    runInAction(() => {
      this.steps.push(step);
    });
  }

  updateStep(index: number, updated: Partial<EvolutionStep>) {
    runInAction(() => {
      const step = this.steps[index];
      if (step) {
        Object.assign(step, updated);
      }
    });
  }

  removeStep(index: number) {
    runInAction(() => {
      this.steps.splice(index, 1);
    });
  }

  resetToDefault() {
    runInAction(() => {
      this.steps = [...defaultEvolutionSteps];
    });
  }
}

export const evolutionStore = new EvolutionStore();
export default evolutionStore;
