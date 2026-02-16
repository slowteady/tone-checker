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

export const SCENARIO_OPTIONS = [
  { value: 'to_child', label: '자녀' },
  { value: 'to_parent', label: '부모님' },
  { value: 'boss', label: '상사' },
  { value: 'colleague', label: '동료' },
  { value: 'client', label: '고객' },
  { value: 'friend', label: '친구' },
  { value: 'partner', label: '연인' },
] as const;

export type Scenario = (typeof SCENARIO_OPTIONS)[number]['value'];

export const TONE_OPTIONS = [
  { value: 'soft', label: '부드럽게' },
  { value: 'firm', label: '단호하게' },
  { value: 'formal', label: '격식있게' },
  { value: 'casual', label: '캐주얼하게' },
] as const;

export type Tone = (typeof TONE_OPTIONS)[number]['value'];

export const MODE_OPTIONS = [
  { value: 'generate', label: '메시지 생성' },
  { value: 'correct', label: '말투 교정' },
] as const;

export type Mode = (typeof MODE_OPTIONS)[number]['value'];
