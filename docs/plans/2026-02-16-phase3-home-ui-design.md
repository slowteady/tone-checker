---
status: completed
phase: 3
completed_date: 2026-02-16
summary: 홈 화면 v2 UI 설계 완료 - Tab 컴포넌트, SelectorField, ExampleBottomSheet 설계
---

# Phase 3: 홈 화면 v2 UI 구현 - 설계 문서

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this plan task-by-task.

**Goal:** v2 홈 화면 기본 UI 구조 구현 (백엔드 연결 없이 UI만)

**Architecture:**
- Tab 컴포넌트로 모드 선택 (생성/교정)
- BottomSheet 방식으로 시나리오/톤 선택
- v1 코드를 별도 폴더로 백업하고 v2로 마이그레이션
- 동적 기능(플레이스홀더, 힌트 등)은 Phase 4 이후 추가

**Tech Stack:**
- React Native
- TDS (Toss Design System)
  - Tab 컴포넌트
  - Button 컴포넌트
  - BottomSheet (기존 패턴 재사용)
- Zustand (form store - Phase 2에서 이미 구현됨)

---

## 1. 전체 구조 (Architecture)

### Phase 3 범위
- ✅ 기본 UI 구조만 구현
- ✅ v1 코드 백업 (`components/v1/`, `pages/v1/`)
- ✅ v2 홈 화면을 메인으로 교체
- ❌ 동적 플레이스홀더 (Phase 4)
- ❌ 동적 힌트 (Phase 4)
- ❌ 백엔드 연결 (Phase 4)

### 홈 화면 구성

```
┌─────────────────────────────┐
│  [메시지 생성] [말투 교정]       │  ← Tab (mode)
│                              │
│  누구에게 보내나요?              │
│  [시나리오 선택 ▼]               │  ← Button → BottomSheet
│                              │
│  어떤 느낌으로?                 │
│  [부드럽게 ▼]                  │  ← Button → BottomSheet
│                              │
│  [텍스트 입력 영역]              │
│  (플레이스홀더: 고정)            │
│                              │
│  [생성하기 / 교정하기]           │  ← mode에 따라 텍스트 변경
└─────────────────────────────┘
```

### 주요 변경점
- **v1**: SegmentedControl 2개 (relationship, situation)
- **v2**: Tab 1개 (mode) + BottomSheet 2개 (scenario, tone)

---

## 2. 컴포넌트 구조 (Components)

### 새로 생성할 컴포넌트

#### SelectBottomSheet (공통 컴포넌트)

**위치:** `src/components/common/SelectBottomSheet.tsx`

**역할:** 범용 선택 BottomSheet (Generic 타입)

**인터페이스:**
```tsx
interface SelectBottomSheetProps<T extends string> {
  open: boolean;
  title: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selectedValue: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}
```

**사용 예시:**
```tsx
// 시나리오 선택
<SelectBottomSheet
  open={scenarioSheetOpen}
  title="누구에게 보내나요?"
  options={SCENARIO_OPTIONS}
  selectedValue={scenario}
  onSelect={setScenario}
  onClose={() => setScenarioSheetOpen(false)}
/>

// 톤 선택
<SelectBottomSheet
  open={toneSheetOpen}
  title="어떤 느낌으로?"
  options={TONE_OPTIONS}
  selectedValue={tone}
  onSelect={setTone}
  onClose={() => setToneSheetOpen(false)}
/>
```

### 수정할 파일

#### pages/index.tsx
- Tab 컴포넌트 추가 (mode 선택)
- 시나리오/톤 선택 버튼 추가
- SelectBottomSheet 2개 통합
- v1 코드 제거 (백업 후)

#### stores/form.ts
- 이미 Phase 2에서 완료 (변경 없음)

### 백업 구조

```
src/
├── components/
│   ├── v1/                          # v1 컴포넌트 백업
│   │   └── (기존 파일들 이동)
│   ├── common/                      # v2 공통 컴포넌트
│   │   ├── ErrorResult.tsx          # 기존
│   │   └── SelectBottomSheet.tsx    # 신규
│   └── home/                        # v2 홈 컴포넌트
│       ├── AnalysisBottomSheet.tsx  # 유지
│       ├── AdBottomSheet.tsx        # 유지
│       └── UsageLimitNotice.tsx     # 유지
├── pages/
│   ├── v1/                          # v1 페이지 백업
│   │   └── index.tsx
│   └── index.tsx                    # v2 홈 화면
```

---

## 3. 상태 관리 및 데이터 흐름 (Data Flow)

### Form Store 상태 (Phase 2에서 구현됨)

```tsx
// stores/form.ts
{
  // v2 필드
  mode: 'generate',           // 기본값
  scenario: null,             // 기본값 (필수 선택)
  tone: 'soft',               // 기본값
  text: '',

  // v1 필드 (유지, 사용 안 함)
  relationship: 'business',
  situation: 'neutral',
}
```

### 컴포넌트 상태 (pages/index.tsx)

```tsx
const [scenarioSheetOpen, setScenarioSheetOpen] = useState(false);
const [toneSheetOpen, setToneSheetOpen] = useState(false);

// Form store에서 가져오기
const mode = useFormStore((s) => s.mode);
const scenario = useFormStore((s) => s.scenario);
const tone = useFormStore((s) => s.tone);
const text = useFormStore((s) => s.text);

const setMode = useFormStore((s) => s.setMode);
const setScenario = useFormStore((s) => s.setScenario);
const setTone = useFormStore((s) => s.setTone);
const setText = useFormStore((s) => s.setText);
```

### 사용자 플로우

```
1. Tab에서 mode 선택 (생성/교정)
   └─> setMode 호출

2. 시나리오 버튼 클릭
   └─> setScenarioSheetOpen(true)
   └─> SelectBottomSheet 열림
   └─> 옵션 선택
   └─> setScenario 호출
   └─> setScenarioSheetOpen(false)

3. 톤 버튼 클릭
   └─> setToneSheetOpen(true)
   └─> SelectBottomSheet 열림
   └─> 옵션 선택
   └─> setTone 호출
   └─> setToneSheetOpen(false)

4. 텍스트 입력
   └─> setText 호출

5. CTA 버튼 클릭
   └─> 백엔드 연결 없음 (Phase 3 범위 밖)
   └─> console.log로 확인만
```

### CTA 활성화 조건 (Phase 3)

```tsx
const isValid = scenario !== null && text.length >= 10;
// mode에 따른 최소 글자수 검증은 Phase 4에서 추가
```

---

## 4. UI 상세 사항 (UI Details)

### 1. Tab (모드 선택)

```tsx
<Tab value={mode} onChange={setMode} size="large">
  <Tab.Item value="generate">메시지 생성</Tab.Item>
  <Tab.Item value="correct">말투 교정</Tab.Item>
</Tab>
```

- 기본값: 'generate'
- 탭 전환 시 동작: Phase 3에서는 아무것도 안 함 (나중에 텍스트 초기화 추가)

### 2. 시나리오 선택 버튼

```tsx
<Button
  onPress={() => setScenarioSheetOpen(true)}
  type={scenario ? "primary" : "dark"}
  style="weak"
  display="block"
>
  {scenario
    ? SCENARIO_OPTIONS.find(o => o.value === scenario)?.label
    : '시나리오 선택'}
</Button>
```

- **선택 전**: "시나리오 선택" (회색)
- **선택 후**: 선택된 값 표시 (파란색)

### 3. 톤 선택 버튼

```tsx
<Button
  onPress={() => setToneSheetOpen(true)}
  type="primary"
  style="weak"
  display="block"
>
  {TONE_OPTIONS.find(o => o.value === tone)?.label}
</Button>
```

- 기본값: "부드럽게"
- 항상 파란색 (기본값 있음)

### 4. SelectBottomSheet 내부 구조

```tsx
<BottomSheet open={open} onClose={onClose}>
  <Txt typography="t4" fontWeight="bold" style={{ marginBottom: 16 }}>
    {title}
  </Txt>
  {options.map((option) => (
    <Button
      key={option.value}
      onPress={() => {
        onSelect(option.value);
        onClose();
      }}
      type={selectedValue === option.value ? "primary" : "dark"}
      style={selectedValue === option.value ? "fill" : "weak"}
      display="block"
      size="large"
      viewStyle={{ marginBottom: 8 }}
    >
      {option.label}
    </Button>
  ))}
</BottomSheet>
```

- **선택된 항목**: 파란색 fill
- **미선택 항목**: 회색 weak
- 항목 클릭 시 자동 닫힘

### 5. CTA 버튼

```tsx
<FixedBottomCTA
  onPress={() => console.log('분석 요청', { mode, scenario, tone, text })}
  disabled={!isValid}
>
  <Txt typography="t6" fontWeight="bold" color={colors.white}>
    {mode === 'generate' ? '생성하기' : '교정하기'}
  </Txt>
</FixedBottomCTA>
```

- mode에 따라 버튼 텍스트 변경
- Phase 3에서는 console.log만 (백엔드 연결 없음)

### 6. 텍스트 입력

```tsx
<TextArea
  placeholder="보내려는 문장을 입력해 주세요."  // 고정 (동적 변경은 Phase 4)
  value={text}
  onChangeText={setText}
  maxLength={800}
  textAreaStyle={{ height: 180 }}
/>
```

- 플레이스홀더: 고정 (동적 변경은 Phase 4)
- 동적 힌트: Phase 4에서 추가

---

## 5. 구현 노트 (Implementation Notes)

### Phase 3 제외 사항 (Phase 4 이후)

1. **동적 플레이스홀더**
   - 시나리오 × 모드 조합별 플레이스홀더
   - 현재: 고정 플레이스홀더 사용

2. **동적 힌트**
   - 글자수 범위별 힌트 메시지
   - 현재: 힌트 없음 또는 고정 힌트

3. **최소 글자수 검증**
   - generate: 10자
   - correct: 20자
   - 현재: 10자 고정

4. **탭 전환 시 텍스트 초기화**
   - 현재: 아무것도 안 함

5. **백엔드 연결**
   - 현재: console.log만

### v1 백업 절차

1. `src/components/v1/` 폴더 생성
2. 기존 v1 전용 컴포넌트 이동 (백업)
3. `src/pages/v1/` 폴더 생성
4. `src/pages/index.tsx` 복사 후 이동 (백업)
5. v2 홈 화면 구현

### TDS 컴포넌트 사용

- **Tab**: 모드 선택
- **Button**: 시나리오/톤 선택 버튼, BottomSheet 내 옵션
- **BottomSheet**: 기존 패턴 재사용 (AnalysisBottomSheet, AdBottomSheet 참고)
- **TextArea**: 기존 사용 중
- **FixedBottomCTA**: 기존 사용 중

### 재사용 상수

- `SCENARIO_OPTIONS` (constants/params.ts)
- `TONE_OPTIONS` (constants/params.ts)
- `MODE_OPTIONS` (constants/params.ts)

---

## 6. 검증 기준 (Verification)

**UI 동작:**
- [ ] Tab으로 모드 전환 가능
- [ ] 시나리오 선택 버튼 클릭 시 BottomSheet 열림
- [ ] 시나리오 선택 시 버튼 텍스트 변경
- [ ] 톤 선택 버튼 클릭 시 BottomSheet 열림
- [ ] 톤 선택 시 버튼 텍스트 변경
- [ ] 텍스트 입력 가능
- [ ] CTA 버튼 활성화/비활성화 조건 동작
- [ ] CTA 클릭 시 console.log 출력

**코드 품질:**
- [ ] v1 코드가 별도 폴더로 백업됨
- [ ] TypeScript 타입 체크 통과
- [ ] ESLint 에러 없음
- [ ] 불필요한 코드 중복 없음

**다음 단계 (Phase 4):**
- 동적 플레이스홀더 구현
- 동적 힌트 구현
- mode별 최소 글자수 검증
- 백엔드 연결
