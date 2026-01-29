import { create } from 'zustand';
import type { Relationship, Situation } from 'constants/params';

type FormState = {
  relationship: Relationship;
  situation: Situation;
  text: string;

  setRelationship: (relationship: Relationship) => void;
  setSituation: (situation: Situation) => void;
  setText: (text: string) => void;
  reset: () => void;
};

const INITIAL_STATE: Pick<FormState, 'relationship' | 'situation' | 'text'> = {
  relationship: 'business',
  situation: 'neutral',
  text: '',
};

export const useFormStore = create<FormState>((set) => ({
  ...INITIAL_STATE,

  setRelationship: (relationship) => set({ relationship }),
  setSituation: (situation) => set({ situation }),
  setText: (text) => set({ text }),
  reset: () => set(INITIAL_STATE),
}));
