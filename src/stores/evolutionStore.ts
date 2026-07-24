import { makeAutoObservable, runInAction } from 'mobx';
import type { EvolutionStep } from '../types';
import { defaultEvolutionSteps } from '../data/sampleData';

class EvolutionStore {
  steps: EvolutionStep[];
  modalOpen: boolean;
  // Counter that increments on every state change so observers get a new value
  version: number;

  constructor() {
    this.steps = [...defaultEvolutionSteps];
    this.modalOpen = false;
    this.version = 0;
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

  // Always return a new array reference so observers detect changes
  getSteps(): EvolutionStep[] {
    this.version; // track dependency on version
    return [...this.steps];
  }

  incrementVersion() {
    runInAction(() => { this.version++; });
  }

  addStep(step: EvolutionStep) {
    runInAction(() => {
      this.steps.push(step);
      this.version++;
    });
  }

  updateStep(index: number, updated: Partial<EvolutionStep>) {
    runInAction(() => {
      const step = this.steps[index];
      if (step) {
        Object.assign(step, updated);
      }
      this.version++;
    });
  }

  removeStep(index: number) {
    runInAction(() => {
      this.steps.splice(index, 1);
      this.version++;
    });
  }

  resetToDefault() {
    runInAction(() => {
      this.steps = [...defaultEvolutionSteps];
      this.version++;
    });
  }

  reorder(fromIndex: number, toIndex: number) {
    runInAction(() => {
      if (fromIndex === toIndex) return;

      const stepA = this.steps[fromIndex];
      const stepOffsets = this.steps.map(item => item.offset);

      this.steps.splice(fromIndex, 1)
      this.steps.splice(toIndex, 0, stepA)
      this.steps.forEach((item, index) => {
        item.offset = stepOffsets[index];
      })

      this.version++;
    });
  }
}

export const evolutionStore = new EvolutionStore();
export default evolutionStore;
