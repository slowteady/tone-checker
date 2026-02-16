# Phase 2: 프론트엔드 상태 & 상수 구현

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** v2 백엔드 API와 연동하기 위한 프론트엔드 타입, 상수, 스토어, 스키마 변경

**Architecture:**
- 기존 v1 구조(relationship/situation)를 유지하면서 v2 구조(mode/scenario/tone) 추가
- 점진적 마이그레이션을 위해 두 버전 병행 지원
- 타입 안전성을 위해 Zod 스키마 먼저 정의 후 TypeScript 타입 추출

**Tech Stack:**
- TypeScript 5.8.3
- Zod 4.3.6
- Zustand 5.0.10
- React Native (Granite framework)

---

## Task 1: params.ts - v2 상수 추가

**Files:**
- Modify: `src/constants/params.ts`

**Step 1: SCENARIO_OPTIONS 상수 추가**

기존 RELATIONSHIP_OPTIONS 아래에 SCENARIO_OPTIONS 추가:

```typescript
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
```

**Step 2: TONE_OPTIONS 상수 추가**

SCENARIO_OPTIONS 아래에 TONE_OPTIONS 추가:

```typescript
export const TONE_OPTIONS = [
  { value: 'soft', label: '부드럽게' },
  { value: 'firm', label: '단호하게' },
  { value: 'formal', label: '격식있게' },
  { value: 'casual', label: '캐주얼하게' },
] as const;

export type Tone = (typeof TONE_OPTIONS)[number]['value'];
```

**Step 3: MODE 타입 추가**

파일 맨 아래에 MODE 타입 추가:

```typescript
export const MODE_OPTIONS = [
  { value: 'generate', label: '메시지 생성' },
  { value: 'correct', label: '말투 교정' },
] as const;

export type Mode = (typeof MODE_OPTIONS)[number]['value'];
```

**Step 4: 타입 체크**

```bash
cd tone-checker
npm run typecheck
```

Expected: 타입 에러 없음

**Step 5: Commit**

```bash
git add src/constants/params.ts
git commit -m "feat(params): add v2 constants (scenario, tone, mode)"
```

---

## Task 2: schema.ts - v2 요청/응답 스키마 추가

**Files:**
- Modify: `src/lib/schema.ts`

**Step 1: v2 요청 스키마 추가**

기존 analyzeRequestSchema 아래에 v2 요청 스키마 추가:

```typescript
export const analyzeRequestV2Schema = z.object({
  /**
   * 모드 (생성/교정)
   */
  mode: z.enum(['generate', 'correct']),
  /**
   * 분석할 텍스트
   */
  text: z.string().min(10).max(800),
  /**
   * 기기 ID
   */
  device_id: z.string(),
  /**
   * 시나리오 (관계)
   */
  scenario: z.enum(['to_child', 'to_parent', 'boss', 'colleague', 'client', 'friend', 'partner']),
  /**
   * 말투 (톤)
   */
  tone: z.enum(['soft', 'firm', 'formal', 'casual']),
  /**
   * 플랫폼
   */
  platform: z.string(),
});
export type AnalyzeRequestV2Dto = z.infer<typeof analyzeRequestV2Schema>;
```

**Step 2: generate 모드 응답 스키마 추가**

usageResultSchema 아래에 추가:

```typescript
export const messageSchema = z.object({
  label: z.string(),
  text: z.string(),
});
export type MessageDto = z.infer<typeof messageSchema>;

export const generateResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    messages: z.array(messageSchema),
    usage: usageResultSchema,
  }),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type GenerateResponseDto = z.infer<typeof generateResponseSchema>;
```

**Step 3: correct 모드 응답 스키마 추가**

generateResponseSchema 아래에 추가:

```typescript
export const correctionSchema = z.object({
  label: z.string(),
  description: z.string(),
  text: z.string(),
});
export type CorrectionDto = z.infer<typeof correctionSchema>;

export const correctResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    diagnosis: z.string(),
    corrections: z.array(correctionSchema),
    overall_score: z.number(),
    summary: z.string(),
    category_scores: categoryScoresSchema,
    signals: z.array(signalSchema),
    warnings: z.array(z.string()),
    usage: usageResultSchema,
  }),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type CorrectResponseDto = z.infer<typeof correctResponseSchema>;
```

**Step 4: 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 없음 (기존 코드에서 analyzeResponseSchema를 아직 사용 중이므로 경고는 무시)

**Step 5: Commit**

```bash
git add src/lib/schema.ts
git commit -m "feat(schema): add v2 request/response schemas (generate, correct)"
```

---

## Task 3: form store - v2 필드 추가

**Files:**
- Modify: `src/stores/form.ts`

**Step 1: import 타입 추가**

파일 상단의 import 수정:

```typescript
import { create } from 'zustand';
import type { Relationship, Situation, Mode, Scenario, Tone } from 'constants/params';
```

**Step 2: FormState 타입 확장**

```typescript
type FormState = {
  // v1 필드 (호환성 유지)
  relationship: Relationship;
  situation: Situation;
  text: string;

  // v2 필드
  mode: Mode;
  scenario: Scenario | null;
  tone: Tone;

  // v1 setters
  setRelationship: (relationship: Relationship) => void;
  setSituation: (situation: Situation) => void;
  setText: (text: string) => void;

  // v2 setters
  setMode: (mode: Mode) => void;
  setScenario: (scenario: Scenario | null) => void;
  setTone: (tone: Tone) => void;

  reset: () => void;
};
```

**Step 3: INITIAL_STATE 수정**

```typescript
const INITIAL_STATE: Pick<FormState, 'relationship' | 'situation' | 'text' | 'mode' | 'scenario' | 'tone'> = {
  // v1 (호환성)
  relationship: 'business',
  situation: 'neutral',
  text: '',

  // v2
  mode: 'generate',
  scenario: null,
  tone: 'soft',
};
```

**Step 4: setter 함수 추가**

```typescript
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
```

**Step 5: 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 없음

**Step 6: Commit**

```bash
git add src/stores/form.ts
git commit -m "feat(store): add v2 fields to form store (mode, scenario, tone)"
```

---

## Task 4: result store - v2 응답 타입 지원

**Files:**
- Modify: `src/stores/result.ts`

**Step 1: import 타입 추가**

파일 상단의 import 수정:

```typescript
import type { AnalyzeResponseDto, GenerateResponseDto, CorrectResponseDto } from 'lib/schema';
import { create } from 'zustand';
```

**Step 2: ResultState 타입 확장**

v1/v2 응답을 모두 지원하도록 Union 타입 사용:

```typescript
type ResultState = {
  analysisResult: AnalyzeResponseDto | GenerateResponseDto | CorrectResponseDto | null;

  setAnalysisResult: (result: AnalyzeResponseDto | GenerateResponseDto | CorrectResponseDto | null) => void;
  clearResult: () => void;
};
```

**Step 3: 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 없음

**Step 4: Commit**

```bash
git add src/stores/result.ts
git commit -m "feat(store): support v2 response types in result store"
```

---

## Task 5: api/analyze.ts - v2 요청 파라미터 추가

**Files:**
- Modify: `src/api/analyze.ts`

**Step 1: import 타입 추가**

```typescript
import { supabase } from 'lib/supabase';
import type {
  AnalyzeRequestDto,
  AnalyzeResponseDto,
  AnalyzeRequestV2Dto,
  GenerateResponseDto,
  CorrectResponseDto,
} from 'lib/schema';
import { ENDPOINT } from 'constants/endpoint';
import { captureError } from 'lib/sentry';
```

**Step 2: analyzeToneV2 함수 추가**

기존 analyzeTone 함수 아래에 v2 함수 추가:

```typescript
/**
 * AI 톤 분석 요청 (v2)
 * mode에 따라 메시지 생성 또는 말투 교정
 */
export async function analyzeToneV2(
  request: AnalyzeRequestV2Dto
): Promise<GenerateResponseDto | CorrectResponseDto> {
  try {
    const { data, error } = await supabase.functions.invoke(ENDPOINT.ANALYZE_TONE, {
      body: {
        mode: request.mode,
        device_id: request.device_id,
        text: request.text,
        scenario: request.scenario,
        tone: request.tone,
        platform: request.platform,
      },
    });

    if (error) {
      captureError(error, {
        location: 'api/analyzeToneV2',
        tags: { feature: 'tone-analysis-v2' },
        extras: {
          mode: request.mode,
          deviceId: request.device_id,
          textLength: request.text.length,
        },
      });
      throw error;
    }

    return data;
  } catch (error) {
    captureError(error, {
      location: 'api/analyzeToneV2/catch',
      tags: { feature: 'tone-analysis-v2' },
    });
    throw new Error('Failed to analyze tone (v2)');
  }
}
```

**Step 3: 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 없음

**Step 4: Commit**

```bash
git add src/api/analyze.ts
git commit -m "feat(api): add analyzeToneV2 function for v2 API"
```

---

## Task 6: 최종 검증

**Files:**
- All modified files

**Step 1: 전체 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 0개

**Step 2: ESLint 검사**

```bash
npm run lint
```

Expected: 에러 없음 (경고는 허용)

**Step 3: 변경 사항 요약 출력**

```bash
git log --oneline -6
```

Expected: 6개 커밋 확인
- feat(params): add v2 constants
- feat(schema): add v2 request/response schemas
- feat(store): add v2 fields to form store
- feat(store): support v2 response types
- feat(api): add analyzeToneV2 function
- (최종 검증 커밋 없음 - 코드 변경 없으므로)

**Step 4: git status 확인**

```bash
git status
```

Expected: working tree clean

---

## 검증 기준

**타입 안전성:**
- [ ] 모든 v2 타입이 Zod 스키마로 정의됨
- [ ] TypeScript에서 타입 에러 없음
- [ ] v1/v2 타입 혼용 시 타입 추론 정상 작동

**기능 완성도:**
- [ ] params.ts에 scenario/tone/mode 상수 정의됨
- [ ] form store가 v2 필드 지원
- [ ] result store가 v2 응답 타입 지원
- [ ] schema.ts에 v2 요청/응답 스키마 정의됨
- [ ] api/analyze.ts에 v2 함수 추가됨

**코드 품질:**
- [ ] 각 작업이 atomic commit으로 분리됨
- [ ] 주석으로 v1/v2 구분 명확
- [ ] YAGNI - 필요한 필드만 추가

---

## 다음 단계 (Phase 3)

Phase 2 완료 후:
- Phase 3: 프론트엔드 홈 화면 UI 구현
  - 모드 탭 (생성/교정)
  - 시나리오 칩 선택 UI
  - 톤 칩 선택 UI
  - 동적 플레이스홀더/힌트
