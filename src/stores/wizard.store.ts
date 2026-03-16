import { create } from 'zustand';

interface WizardState {
  currentStep: number;
  deckId: string | null;
  setStep: (step: number) => void;
  setDeckId: (id: string) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>()((set) => ({
  currentStep: 1,
  deckId: null,
  setStep: (step: number) => set({ currentStep: step }),
  setDeckId: (id: string) => set({ deckId: id }),
  reset: () => set({ currentStep: 1, deckId: null }),
}));
