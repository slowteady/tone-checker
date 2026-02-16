import { create } from 'zustand';
import type { Mode, Scenario, Tone } from 'constants/params';

type FormState = {
  text: string;
  mode: Mode;
  scenario: Scenario;
  tone: Tone;

  setText: (text: string) => void;
  setMode: (mode: Mode) => void;
  setScenario: (scenario: Scenario) => void;
  setTone: (tone: Tone) => void;

  reset: () => void;
};

const INITIAL_STATE: Pick<FormState, 'text' | 'mode' | 'scenario' | 'tone'> = {
  text: '',
  mode: 'generate',
  scenario: 'to_child',
  tone: 'soft',
};

export const useFormStore = create<FormState>((set) => ({
  ...INITIAL_STATE,

  setText: (text) => set({ text }),
  setMode: (mode) => set({ mode }),
  setScenario: (scenario) => set({ scenario }),
  setTone: (tone) => set({ tone }),

  reset: () => set(INITIAL_STATE),
}));
