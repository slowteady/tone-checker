import { create } from 'zustand';
import type { Relationship, Situation } from 'constants/params';

type FormState = {
  deviceId: string;
  relationship: Relationship;
  situation: Situation;
  text: string;

  setDeviceId: (deviceId: string) => void;
  setRelationship: (relationship: Relationship) => void;
  setSituation: (situation: Situation) => void;
  setText: (text: string) => void;
  reset: () => void;
};

const INITIAL_STATE: Pick<FormState, 'relationship' | 'situation' | 'text' | 'deviceId'> = {
  relationship: 'business',
  situation: 'neutral',
  text: '',
  deviceId: '',
};

export const useFormStore = create<FormState>((set) => ({
  ...INITIAL_STATE,

  setDeviceId: (deviceId) => set({ deviceId }),
  setRelationship: (relationship) => set({ relationship }),
  setSituation: (situation) => set({ situation }),
  setText: (text) => set({ text }),
  reset: () => set(INITIAL_STATE),
}));
