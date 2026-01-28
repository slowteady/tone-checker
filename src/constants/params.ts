export const RELATIONSHIP_OPTIONS = [
  { value: 'business', label: '비즈니스' },
  { value: 'personal', label: '개인' },
] as const;

export type Relationship = (typeof RELATIONSHIP_OPTIONS)[number]['value'];

export const SITUATION_OPTIONS = [
  { value: 'neutral', label: '일반' },
  { value: 'sensitive', label: '조심' },
  { value: 'casual', label: '편안' },
] as const;

export type Situation = (typeof SITUATION_OPTIONS)[number]['value'];
