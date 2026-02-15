# 07. 구현 계획

## 1. 구현 순서

의존성 기준으로 백엔드 → 프론트엔드 순서로 진행.

```
Phase 1: 백엔드 (Edge Function)
  ├─ 1-1. 입력 스키마 변경 (mode/scenario/tone)
  ├─ 1-2. 생성 모드 시스템 프롬프트 + JSON Schema + Zod
  ├─ 1-3. 교정 모드 프롬프트 수정 (diagnosis/corrections 추가)
  └─ 1-4. index.ts 모드 분기 로직

Phase 2: 프론트엔드 - 상태 & 상수
  ├─ 2-1. params.ts 변경 (scenario/tone 옵션)
  ├─ 2-2. form store 변경 (mode/scenario/tone)
  ├─ 2-3. result store 변경 (모드별 결과)
  ├─ 2-4. schema.ts 변경 (요청/응답 스키마)
  └─ 2-5. api/analyze.ts 변경 (새 파라미터)

Phase 3: 프론트엔드 - 홈 화면
  ├─ 3-1. 모드 탭 UI
  ├─ 3-2. 시나리오 칩 (6개)
  ├─ 3-3. 톤 칩 (4개)
  ├─ 3-4. 가이드 텍스트 + 동적 힌트
  ├─ 3-5. 동적 플레이스홀더
  ├─ 3-6. CTA 버튼 활성화 조건
  └─ 3-7. 잔여 1회 충전 아이콘

Phase 4: 프론트엔드 - 결과 화면
  ├─ 4-1. 생성 모드 결과 (메시지 카드 3개)
  ├─ 4-2. 교정 모드 결과 (한줄 진단 + 교정 카드 3개)
  ├─ 4-3. CopyCard props 변경
  ├─ 4-4. 상세 분석 링크 + 상세 분석 페이지
  └─ 4-5. 로딩 화면 문구 분기

Phase 5: 테스트 & 정리
  ├─ 5-1. Edge Function 로컬 테스트 (생성/교정 각각)
  ├─ 5-2. 프론트엔드 통합 테스트
  └─ 5-3. 기존 v1 코드 정리
```

## 2. 파일별 변경 범위

### 백엔드 (Edge Function)

| 파일 | 변경 유형 | 상세 |
|------|----------|------|
| `index.ts` | 수정 | mode 파싱, scenario/tone 타입, 분기 로직, 길이 검증 분기 |
| `lib/system.ts` | 삭제 | systemGenerate.ts + systemCorrect.ts로 분리 |
| `lib/systemGenerate.ts` | 신규 | 메시지 생성 시스템 프롬프트 |
| `lib/systemCorrect.ts` | 신규 | 교정 시스템 프롬프트 (기존 기반 + diagnosis/corrections) |
| `lib/openai.ts` | 수정 | Context 타입 변경, 모드별 호출 분기 |
| `lib/zod.ts` | 수정 | 생성 스키마 추가, 교정 스키마 수정 |
| `lib/jsonSchema.ts` | 수정 | 생성 JSON Schema 추가, 교정 스키마 수정 |
| `lib/reportError.ts` | 유지 | 변경 없음 |

### 프론트엔드 - 상수 & 타입

| 파일 | 변경 유형 | 상세 |
|------|----------|------|
| `constants/params.ts` | 수정 | SCENARIO_OPTIONS(6개), TONE_OPTIONS(4개), MODE 타입 |
| `lib/schema.ts` | 수정 | 요청 스키마(mode/scenario/tone), 응답 스키마 2개 |
| `constants/endpoint.ts` | 유지 | ANALYZE_TONE 엔드포인트 동일 |

### 프론트엔드 - Store

| 파일 | 변경 유형 | 상세 |
|------|----------|------|
| `stores/form.ts` | 수정 | mode, scenario(null), tone('soft') 필드 추가 |
| `stores/result.ts` | 수정 | 모드별 결과 타입 분리 |
| `stores/device.ts` | 유지 | 변경 없음 |

### 프론트엔드 - API

| 파일 | 변경 유형 | 상세 |
|------|----------|------|
| `api/analyze.ts` | 수정 | 요청 파라미터 변경 (mode/scenario/tone) |
| `api/usage.ts` | 유지 | 변경 없음 |

### 프론트엔드 - 페이지

| 파일 | 변경 유형 | 상세 |
|------|----------|------|
| `pages/index.tsx` | 대폭 수정 | 모드 탭, 시나리오/톤 칩, 가이드+힌트, 동적 플레이스홀더 |
| `pages/loading/index.tsx` | 수정 | 로딩 문구 모드별 분기 |
| (결과 페이지) | 신규 or 수정 | 생성/교정 결과 분기, 상세 분석 링크 |

### 프론트엔드 - 컴포넌트

| 파일 | 변경 유형 | 상세 |
|------|----------|------|
| `CopyCard.tsx` | 수정 | props 변경 (description 제거 → text 추가) |
| `ResultCard.tsx` | 유지 | 상세 분석 페이지에서 그대로 사용 |
| `Progressbar.tsx` | 유지 | 상세 분석 페이지에서 그대로 사용 |
| `SignalCard.tsx` | 유지 | 상세 분석 페이지에서 그대로 사용 |
| `ErrorResult.tsx` | 유지 | 변경 없음 |
| `UsageLimitNotice.tsx` | 수정 | 잔여 1회 충전 아이콘 추가 |
| `AdBottomSheet.tsx` | 유지 | 변경 없음 |
| `AnalysisBottomSheet.tsx` | 수정 or 제거 | 결과 화면 구조 변경에 따라 판단 |

## 3. 구현 우선순위 기준

1. **백엔드 먼저** — 프론트엔드가 백엔드 응답 구조에 의존
2. **생성 모드 먼저** — 신규 기능이고 메인 모드
3. **교정 모드는 기존 코드 활용** — 변경 범위가 상대적으로 작음
4. **상세 분석은 마지막** — 기존 컴포넌트 재사용, 연결만 변경

## 4. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 생성 프롬프트 품질 | 결과 메시지 품질 좌우 | 프롬프트 반복 튜닝, 시나리오별 테스트 |
| 응답 스키마 전환 | 기존 사용자 앱 캐시 | v1 응답도 graceful하게 처리하는 방어 코드 |
| OpenAI 비용 증가 | 생성 모드 추가로 호출 증가 | generate max_output_tokens 1500으로 제한 |
| 50대+ UX | 탭/칩 UI 복잡성 | 기본값 설정으로 최소 선택만으로 사용 가능하게 |
