# 05. AI & API 스펙

## 1. 현행 구조 (v1)

```
클라이언트 → Edge Function (analyze-tone) → OpenAI GPT-4.1-mini → Zod 검증 → 응답
                                              │
                                              └─ 단일 시스템 프롬프트
                                                 (점수 분석 + 제안 3개)
```

- **엔드포인트**: `analyze-tone` (단일)
- **모델**: `gpt-4.1-mini`
- **입력**: text + relationship(2개) + situation(3개)
- **출력**: overall_score + 5카테고리 점수 + signals + suggestions 3개 + warnings

## 2. v2 구조

```
클라이언트 → Edge Function → 모드 분기
                              │
                              ├─ generate → 생성 프롬프트 → 메시지 3개 응답
                              │
                              └─ correct  → 교정 프롬프트 → 진단 + 교정 3개 + 상세 분석 응답
```

### 변경 방식: 단일 Edge Function 유지, 내부 분기

기존 `analyze-tone` Edge Function 하나에서 `mode` 파라미터로 분기한다.
Edge Function을 분리하지 않는 이유:
- 공통 로직 (입력 검증, 사용량 차감, 에러 처리)이 동일
- Supabase Edge Function 배포 관리 단순화
- 추후 분리가 필요하면 그때 분리

## 3. API 요청 스키마

### v1 (현행)

```typescript
{
  text: string;           // 20~800자
  device_id: string;
  relationship: 'business' | 'personal';
  situation: 'neutral' | 'sensitive' | 'casual';
  platform: string;
}
```

### v2 (변경)

```typescript
{
  mode: 'generate' | 'correct';
  text: string;           // generate: 10~800자, correct: 20~800자
  device_id: string;
  scenario: 'to_child' | 'to_parent' | 'boss' | 'colleague' | 'client' | 'friend' | 'partner';
  tone: 'soft' | 'firm' | 'formal' | 'casual';
  platform: string;
}
```

### 입력 검증 변경

| 항목 | v1 | v2 |
|------|----|----|
| 최소 글자수 | 20자 (고정) | generate: 10자, correct: 20자 |
| 최대 글자수 | 800자 | 800자 (유지) |
| relationship | 필수 | 제거 → scenario로 대체 |
| situation | 필수 | 제거 → tone으로 대체 |
| mode | 없음 | 필수 (신규) |
| scenario | 없음 | 필수 (신규) |
| tone | 없음 | 필수 (신규) |

## 4. 메시지 생성 모드 (generate)

### 시스템 프롬프트 설계

```
역할: 한국어 커뮤니케이션 도우미
목표: 사용자가 설명한 상황에 맞는 메시지 3개를 생성

규칙:
- JSON 스키마 형식으로만 출력
- 메시지 3개는 각각 다른 톤/스타일로 작성
- 사용자가 선택한 시나리오와 톤을 기본 방향으로 삼되, 3개 모두 다른 변형 제공
- 한국어 존칭 체계를 시나리오에 맞게 적용
- 바로 복사해서 메신저에 붙여넣기 가능한 완성된 문장
- 이모지, 외국어 사용 금지
- 존댓말 기본, 시나리오·톤에 따라 반말 허용
```

### 유저 메시지 구성

```
시나리오: {scenarioLabel} ({scenario})
톤: {toneLabel} ({tone})
상황: {text}
```

### 응답 스키마

```typescript
{
  messages: [
    { label: string, text: string },   // 메시지 1
    { label: string, text: string },   // 메시지 2
    { label: string, text: string },   // 메시지 3
  ]
}
```

- `label`: 톤 라벨 (예: "부드러운 표현", "격식 있는 표현", "친근한 표현") — 최대 20자
- `text`: 생성된 메시지 본문 — 최대 1200자

### 라벨 생성 규칙

AI가 선택한 톤을 기본으로 삼되 3개를 다르게 변형:

| 사용자 선택 톤 | 카드 1 (기본) | 카드 2 (변형) | 카드 3 (변형) |
|--------------|-------------|-------------|-------------|
| 부드럽게 | "부드러운 표현" | "격식 있는 표현" | "친근한 표현" |
| 단호하게 | "단호한 표현" | "부드럽지만 확실한 표현" | "간결한 표현" |
| 격식있게 | "격식 있는 표현" | "정중하면서 따뜻한 표현" | "비즈니스 표현" |
| 캐주얼하게 | "친근한 표현" | "센스 있는 표현" | "편안한 표현" |

> 위 표는 가이드이며, AI가 상황에 맞게 자연스럽게 조정 가능

## 5. 말투 교정 모드 (correct)

### 시스템 프롬프트 설계

v1 시스템 프롬프트를 기반으로 확장:

```
역할: 한국어 톤 분석 및 교정 전문가
목표:
  1) 입력 문장의 톤을 한줄로 진단
  2) 3가지 방향으로 교정한 문장 제공
  3) 상세 5카테고리 점수 분석 제공

규칙:
- JSON 스키마 형식으로만 출력
- 한줄 진단: 50자 이내, 존댓말
- 교정 문장 3개: 각각 다른 방향 (부드럽게/격식있게/간결하게 등)
- 상세 분석: v1 기존 규칙 그대로 (5카테고리, 10세부항목, 시그널, 경고)
- 한국어만 사용, 이모지 금지
```

### 유저 메시지 구성

```
시나리오: {scenarioLabel} ({scenario})
톤: {toneLabel} ({tone})
문장: {text}
```

### 응답 스키마

```typescript
{
  diagnosis: string,              // 한줄 진단 (최대 50자)
  corrections: [
    { label: string, text: string },
    { label: string, text: string },
    { label: string, text: string },
  ],
  // 상세 분석 (v1 구조 그대로)
  overall_score: number,
  summary: string,
  category_scores: CategoryScores,
  signals: Signal[],
  warnings: string[],
}
```

### v1 대비 추가되는 필드

| 필드 | 설명 | 신규 여부 |
|------|------|----------|
| `diagnosis` | 한줄 진단 | 신규 |
| `corrections` | 교정 문장 3개 | 신규 (v1 suggestions 대체) |
| `overall_score` | 전체 점수 | 유지 |
| `category_scores` | 5카테고리 점수 | 유지 |
| `signals` | 시그널 | 유지 |
| `warnings` | 경고 | 유지 |

> v1의 `suggestions` → v2의 `corrections`로 이름 변경.
> corrections는 label + text 구조 (v1의 label + description + example에서 description 제거).

## 6. Edge Function 변경 범위

### index.ts 변경

```
현재:
  입력 파싱 → 길이 검증(20~800) → OpenAI 호출 → Zod 검증 → 사용량 차감 → 응답

변경:
  입력 파싱 → mode 분기
    ├─ generate: 길이 검증(10~800) → 생성 프롬프트 호출 → Zod 검증 → 사용량 차감 → 응답
    └─ correct:  길이 검증(20~800) → 교정 프롬프트 호출 → Zod 검증 → 사용량 차감 → 응답
```

### 파일별 변경

| 파일 | 변경 내용 |
|------|----------|
| `index.ts` | mode 파라미터 파싱, scenario/tone 타입 추가, 분기 로직 |
| `lib/system.ts` | 생성 모드 시스템 프롬프트 추가 (기존 교정 프롬프트 유지) |
| `lib/openai.ts` | Context 타입 변경 (scenario/tone), 모드별 호출 함수 |
| `lib/zod.ts` | 생성 모드 Zod 스키마 추가, 교정 모드 스키마 수정 |
| `lib/jsonSchema.ts` | 생성 모드 JSON Schema 추가, 교정 모드 스키마 수정 |

### 시스템 프롬프트 파일 구조

```
lib/
├── system.ts              → systemGenerate.ts (신규)
│                          → systemCorrect.ts  (기존 system.ts 리네임 + 수정)
├── openai.ts              → 수정 (모드별 분기)
├── zod.ts                 → 수정 (스키마 2개)
└── jsonSchema.ts          → 수정 (스키마 2개)
```

## 7. 모델 선택

| 항목 | 현행 | v2 |
|------|------|-----|
| 모델 | gpt-4.1-mini | gpt-4.1-mini (유지) |
| max_output_tokens | 2500 | generate: 1500, correct: 2500 |
| 타임아웃 | 45s | 45s (유지) |

생성 모드는 점수 분석이 없어 출력이 짧으므로 토큰을 줄여 비용 절감.

## 8. 시나리오/톤 라벨 매핑

```typescript
const SCENARIO_LABEL: Record<Scenario, string> = {
  to_child: '자녀에게',
  to_parent: '부모에게',
  boss: '직장상사',
  colleague: '동료',
  client: '거래처',
  friend: '친구',
  partner: '연인',
};

const TONE_LABEL: Record<Tone, string> = {
  soft: '부드럽게',
  firm: '단호하게',
  formal: '격식있게',
  casual: '캐주얼하게',
};
```

## 9. 에러 코드 변경

| 코드 | v1 | v2 |
|------|----|----|
| METHOD_NOT_ALLOWED | 유지 | 유지 |
| INVALID_JSON | 유지 | 유지 |
| INVALID_INPUT | 유지 | 유지 + mode/scenario/tone 검증 추가 |
| TEXT_TOO_SHORT | 유지 | 모드별 최소 길이 분기 |
| TEXT_TOO_LONG | 유지 | 유지 |
| CONFIG_MISSING | 유지 | 유지 |
| OPENAI_IMPORT_FAILED | 유지 | 유지 |
| ANALYSIS_REFUSED | 유지 | 유지 |
| ANALYSIS_FAILED | 유지 | 유지 |
| USAGE_LIMIT_EXCEEDED | 유지 | 유지 |
| INVALID_MODE | 없음 | 신규 |
