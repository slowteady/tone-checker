import { create } from 'zustand';
import type { Relationship, Situation, Mode, Scenario, Tone } from 'constants/params';

type FormState = {
  // v1 필드 (호환성 유지)
  relationship: Relationship;
  situation: Situation;
  text: string;

  // v2 필드
  mode: Mode;
  scenario: Scenario;
  tone: Tone;

  // v1 setters
  setRelationship: (relationship: Relationship) => void;
  setSituation: (situation: Situation) => void;
  setText: (text: string) => void;

  // v2 setters
  setMode: (mode: Mode) => void;
  setScenario: (scenario: Scenario) => void;
  setTone: (tone: Tone) => void;

  reset: () => void;
};

const INITIAL_STATE: Pick<FormState, 'relationship' | 'situation' | 'text' | 'mode' | 'scenario' | 'tone'> = {
  // v1 (호환성)
  relationship: 'business',
  situation: 'neutral',
  text: '',

  // v2
  mode: 'generate',
  scenario: 'to_child', // 첫 번째 시나리오가 기본값
  tone: 'soft',
};

export const useFormStore = create<FormState>((set) => ({
  ...INITIAL_STATE,

  // v1 setters
  setRelationship: (relationship) => set({ relationship }),
  setSituation: (situation) => set({ situation }),
  setText: (text) => set({ text }),

  // v2 setters
  setMode: (mode) => set({ mode }),
  setScenario: (scenario) => set({ scenario }),
  setTone: (tone) => set({ tone }),

  reset: () => set(INITIAL_STATE),
}));
