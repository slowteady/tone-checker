---
status: completed
phase: 4
completed_date: 2026-02-16
summary: Task 1-3 스킵 결정 - 기존 UI/UX 충분, validation 이미 구현 완료
next_steps: 테스트 진행 및 로직 정리
---

# Phase 4: 동적 기능 구현 계획

## 현재 상태 (2026-02-16)

### ✅ 완료된 작업

**Phase 1-2: 백엔드 v2 구현**
- v2 API 완료 (mode: generate/correct)
- systemGenerate.ts, systemCorrect.ts 프롬프트 최적화
- 파라미터: mode, scenario, tone, text

**Phase 3: 프론트엔드 UI 구현**
- Tab 컴포넌트로 모드 선택 (생성/교정)
- SelectorField로 시나리오/톤 선택
- ExampleBottomSheet (예시 문장)
- v1 코드 백업 완료

**프론트엔드-백엔드 연결 (2026-02-16)**
- loading/index.tsx: analyzeTone → analyzeToneV2
- v1 파라미터 (relationship, situation) → v2 파라미터 (mode, scenario, tone)
- result 페이지: correct 모드 지원
- suggestion 페이지: generate/correct 둘 다 지원

**Task 1-3 스킵 결정 (2026-02-16)**
- 동적 플레이스홀더: 불필요 (기존 고정 문구로 충분)
- 동적 힌트: 불필요
- 최소 글자수 검증: 이미 수동 구현 완료
- UI/UX가 충분히 직관적이므로 추가 동적 기능 구현하지 않음

### 🔍 현재 코드 상태

**홈 화면 (`src/pages/index.tsx`)**
- mode 선택: SegmentedControl (생성/교정)
- scenario 선택: SelectorField + useBottomSheet
- tone 선택: SelectorField + useBottomSheet
- 글자수 제한: 500자
- 최소 글자수: mode별 검증 (generate: 10자, correct: 20자)
- **이미 구현됨**: mode 변경 시 텍스트 초기화 (365줄)

**결과 화면**
- **generate 모드**: loading → `/suggestion` (생성된 메시지만)
- **correct 모드**: loading → `/suggestion` (교정 문장 + overall 점수) → `/result` (상세 분석)
- **v1**: loading → `/result` (분석 점수) → `/suggestion` (교정 문장)

---

## Phase 4: 동적 기능 구현

### 목표

기본 UI 구조는 완성되었으므로, 사용자 경험을 개선하는 동적 기능들을 추가합니다.

### 우선순위

1. **높음**: 동적 플레이스홀더 (사용자 가이드)
2. **중간**: 동적 힌트 (글자수 피드백)
3. **낮음**: 추가 검증 및 개선

---

## Task 0: 플로우 수정 (긴급)

### 배경

Phase 3 구현 시 플로우가 잘못 구현되었습니다:

**현재 (잘못됨):**
- generate: loading → /result (리다이렉트) → /suggestion
- correct: loading → /result (분석) → /suggestion (교정 문장)

**올바른 플로우:**
- generate: loading → /suggestion (메시지만)
- correct: loading → /suggestion (교정 문장 + overall) → /result (디테일)
- v1: loading → /result (분석) → /suggestion (교정 문장) [기존 유지]

### 구현 방법

**1. loading/index.tsx 수정 (210줄)**

```tsx
useEffect(() => {
  if (adDismissed && analysisDone) {
    resetForm();

    // mode에 따라 분기
    if (mode === 'generate' || mode === 'correct') {
      navigation.replace('/suggestion');
    } else {
      navigation.replace('/result');  // v1
    }
  }
}, [adDismissed, analysisDone, navigation, mode]);
```

**2. suggestion/index.tsx 수정**

correct 모드일 때 overall_score + diagnosis 표시:

```tsx
// 파일 상단에 useNavigation 추가
const navigation = useNavigation();

// items 렌더링 전에 correct 모드 체크
const isCorrect = isCorrectResponse(analysisResult);

return (
  <FixedBottomCTAProvider>
    <View style={styles.container}>
      {/* correct 모드: overall + diagnosis */}
      {isCorrect && (
        <View style={{ marginBottom: 16, padding: 16, backgroundColor: colors.grey50, borderRadius: 12 }}>
          <Flex direction="row" justify="space-between" align="center">
            <Txt typography="st6" fontWeight="semiBold" color={colors.grey700}>
              종합 점수
            </Txt>
            <Txt typography="t4" fontWeight="bold" color={colors.grey900}>
              {analysisResult.data.overall_score}점
            </Txt>
          </Flex>
          <Txt typography="st11" color={colors.grey600} style={{ marginTop: 8 }}>
            {analysisResult.data.diagnosis}
          </Txt>
        </View>
      )}

      <Txt typography="t3" fontWeight="bold" color={colors.grey900} style={{ marginBottom: 16 }}>
        이런 표현은 어떠세요?
      </Txt>

      {items.map((item, index) => (
        <View key={index} style={{ marginBottom: 16 }}>
          <CopyCard label={item.label} description={item.description} example={item.example} />
        </View>
      ))}
    </View>

    {/* correct: 자세히 보기, 나머지: 홈으로 */}
    {isCorrect ? (
      <FixedBottomCTA onPress={() => navigation.push('/result')}>
        <Txt typography="t6" fontWeight="bold" color={colors.white}>
          분석 결과 자세히 보기
        </Txt>
      </FixedBottomCTA>
    ) : (
      <FixedBottomCTA onPress={() => navigation.popToTop()}>
        <Txt typography="t6" fontWeight="bold" color={colors.white}>
          홈으로 돌아가기
        </Txt>
      </FixedBottomCTA>
    )}
  </FixedBottomCTAProvider>
);
```

**3. result/index.tsx 수정 (139-143줄)**

v2 correct는 홈으로, v1은 suggestion으로:

```tsx
{isCorrectResponse(analysisResult) ? (
  <FixedBottomCTA onPress={() => navigation.popToTop()}>
    <Txt typography="t6" fontWeight="bold" color={colors.white}>
      홈으로 돌아가기
    </Txt>
  </FixedBottomCTA>
) : (
  <FixedBottomCTA onPress={navigateToSuggestion}>
    <Txt typography="t6" fontWeight="bold" color={colors.white}>
      개선된 문장 확인하기
    </Txt>
  </FixedBottomCTA>
)}
```

**4. 검증**

```bash
npm run typecheck
```

- [x] generate: loading → suggestion
- [x] correct: loading → suggestion (overall + diagnosis 표시) → result
- [x] v1: loading → result → suggestion
- [x] result 페이지 버튼 분기 확인

### ✅ Task 0 완료 (2026-02-16 세션 2)

**구현 완료:**
1. loading/index.tsx - mode에 따라 분기 완료
2. suggestion/index.tsx - correct 모드에서 overall_score + diagnosis 표시 완료
3. result/index.tsx - 버튼 분기 완료
4. AnalysisBottomSheet.tsx - mode prop 추가, "생성"/"교정" 텍스트 동적화
5. loading/index.tsx - "AI가 열심히 생성중/교정중" 텍스트 동적화
6. 타입 체크 통과

---

## 로컬 Supabase 설정 (2026-02-16 세션 2)

### 배경

프로덕션 Supabase에는 v1 Edge Function이 배포되어 있어, v2 테스트를 위해 로컬 환경이 필요합니다.

### 설정 완료

**1. 환경 변수 설정**

파일: `package.json`
```json
"dev:local": "DOTENV_CONFIG_PATH=.env.local granite dev"
```

파일: `granite.config.ts`
```ts
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
```

파일: `.env.local`
```
SUPABASE_URL=http://172.30.1.78:54321
SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

**2. 로컬 Supabase 시작**

```bash
supabase status  # 실행 중 확인
supabase db reset  # 마이그레이션 적용
```

**3. Edge Function 시작**

```bash
OPENAI_API_KEY="your-key" supabase functions serve analyze-tone --no-verify-jwt
```

### ⚠️ 현재 문제

Edge Function이 500 에러를 반환하고 있습니다:
```
ERROR  [ERROR] api/analyzeToneV2 [FunctionsHttpError: Edge Function returned a non-2xx status code]
```

**확인 필요:**
- [ ] OpenAI API 키가 제대로 전달되는지
- [ ] Edge Function 로그 확인
- [ ] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 환경 변수 확인

**디버깅 명령:**
```bash
# Edge Function 로그 확인
tail -f /tmp/supabase-functions-*.log

# Edge Function 테스트
curl -i http://172.30.1.78:54321/functions/v1/analyze-tone \
  -H "Content-Type: application/json" \
  -d '{"mode":"correct","device_id":"test","text":"테스트","scenario":"boss","tone":"formal","platform":"ios"}'
```

### ✅ Edge Function 정상 작동 확인 (curl 테스트 성공)

### 🔍 다음 세션 작업

**우선순위 1: 횟수 차감 로직 테스트**
- 문제: 횟수 차감이 제때 이루어지지 않는 것으로 보임
- 확인 필요:
  - [ ] 분석 실행 후 remaining_free 카운트 감소 확인
  - [ ] 로딩 페이지에서 use_analysis_once RPC 호출 확인
  - [ ] optimistic update 후 실제 서버 응답과 동기화 확인
  - [ ] 에러 발생 시 횟수 차감 롤백 확인

**우선순위 2: 전체 플로우 테스트**
1. generate 모드: 메시지 생성 테스트
2. correct 모드: 말투 교정 테스트 (overall + 자세히 보기)
3. 플로우 정상 작동 확인

**우선순위 3: Task 1-3 진행**
- Task 1: 동적 플레이스홀더
- Task 2: 동적 힌트
- Task 3: 최소 글자수 검증 강화

### ❌ Task 1-3 스킵 결정 (2026-02-16)

**결정 사항:**
- 동적 플레이스홀더: 불필요 (기존 고정 문구로 충분)
- 동적 힌트: 불필요
- 최소 글자수 검증: 이미 수동으로 구현 완료

**이유:**
현재 UI/UX가 충분히 직관적이며, 추가 동적 기능 없이도 사용자 가이드가 명확함. validation은 이미 구현되어 있음.

---

## ~~Task 1: 동적 플레이스홀더 구현~~ (스킵됨)

### 배경

현재 TextArea의 placeholder는 고정되어 있습니다:
```tsx
{mode === 'generate' ? '상황을 자유롭게 설명해 주세요' : '교정할 문장을 입력해 주세요'}
```

시나리오별로 구체적인 예시를 보여주면 사용자가 더 쉽게 입력할 수 있습니다.

### 구현 방법

**1. 상수 정의**

파일: `src/constants/placeholders.ts`

```tsx
import type { Scenario, Mode } from './params';

type PlaceholderKey = `${Mode}_${Scenario}`;

export const PLACEHOLDER_MAP: Record<PlaceholderKey, string> = {
  // generate 모드
  generate_to_child: '예: 오늘 학교에서 뭐했어? 재밌었어?',
  generate_to_parent: '예: 주말에 뵙고 싶어요. 시간 괜찮으세요?',
  generate_boss: '예: 내일 회의 일정 조율 가능할까요?',
  generate_colleague: '예: 이번 프로젝트 협업 제안드려요',
  generate_client: '예: 프로젝트 진행 상황 공유드립니다',
  generate_friend: '예: 이번 주말에 만날래? 영화 보자',
  generate_partner: '예: 오늘 저녁 데이트하고 싶어',

  // correct 모드
  correct_to_child: '예: 숙제 안했냐? 왜 맨날 이래',
  correct_to_parent: '예: 이번 주말 갈게 시간 있지?',
  correct_boss: '예: 내일 회의 시간 좀 바꾸면 안될까요',
  correct_colleague: '예: 이거 좀 도와줄 수 있어?',
  correct_client: '예: 일정이 좀 밀려서 늦을 것 같아요',
  correct_friend: '예: 야 주말에 뭐해 심심한데',
  correct_partner: '예: 오늘 바쁘지 않으면 만나고 싶어',
};

export function getPlaceholder(mode: Mode, scenario: Scenario | null): string {
  if (!scenario) {
    return mode === 'generate' ? '상황을 자유롭게 설명해 주세요' : '교정할 문장을 입력해 주세요';
  }

  const key: PlaceholderKey = `${mode}_${scenario}`;
  return PLACEHOLDER_MAP[key] || '입력해 주세요';
}
```

**2. 홈 화면 적용**

파일: `src/pages/index.tsx`

```tsx
import { getPlaceholder } from 'constants/placeholders';

// ...

const placeholder = useMemo(() => getPlaceholder(mode, scenario), [mode, scenario]);

// JSX에서
<TextArea
  placeholder={placeholder}
  value={text}
  onChangeText={setText}
  maxLength={500}
  textAreaStyle={{ height: 200, marginBottom: 40 }}
/>
```

**3. 검증**

```bash
npm run typecheck
```

- [ ] 시나리오 변경 시 placeholder 업데이트 확인
- [ ] 시나리오 미선택 시 기본 placeholder 표시
- [ ] mode 변경 시 placeholder 업데이트 확인

---

## ~~Task 2: 동적 힌트 구현~~ (스킵됨)

### 배경

현재 힌트는 없거나 고정되어 있습니다. 글자수에 따라 피드백을 제공하면 사용자가 더 나은 입력을 할 수 있습니다.

### 구현 방법

**1. 힌트 로직**

파일: `src/hooks/useInputHint.ts`

```tsx
import { useMemo } from 'react';
import type { Mode } from 'constants/params';

type HintLevel = 'info' | 'warning' | 'error';

interface Hint {
  message: string;
  level: HintLevel;
}

export function useInputHint(mode: Mode, textLength: number): Hint | null {
  return useMemo(() => {
    const minLength = mode === 'generate' ? 10 : 20;

    if (textLength === 0) {
      return null;
    }

    if (textLength < minLength) {
      return {
        message: `최소 ${minLength}자 이상 입력해주세요.`,
        level: 'error',
      };
    }

    if (textLength <= 50) {
      return {
        message: '조금 더 자세히 입력하면 더 정확한 결과를 받을 수 있어요.',
        level: 'info',
      };
    }

    if (textLength >= 450) {
      return {
        message: `${500 - textLength}자 남았어요.`,
        level: 'warning',
      };
    }

    return null;
  }, [mode, textLength]);
}
```

**2. 홈 화면 적용**

파일: `src/pages/index.tsx`

```tsx
import { useInputHint } from 'hooks/useInputHint';

// ...

const hint = useInputHint(mode, text.length);

// JSX에서
<TextArea
  value={text}
  onChangeText={setText}
  maxLength={500}
  textAreaStyle={{ height: 200, marginBottom: 40 }}
  help={
    hint && (
      <Flex direction="row" align="center" style={{ paddingVertical: 8 }}>
        <Asset.Icon
          name={
            hint.level === 'error'
              ? 'icon-info-circle-red'
              : hint.level === 'warning'
              ? 'icon-info-circle-yellow'
              : 'icon-info-circle-blue'
          }
          frameShape={{ width: 16, height: 16 }}
          style={{ marginRight: 4 }}
        />
        <Txt typography="st12" fontWeight="semiBold" color={colors.grey500}>
          {hint.message}
        </Txt>
      </Flex>
    )
  }
/>
```

**3. 검증**

- [ ] 글자수 0: 힌트 없음
- [ ] 글자수 1-9 (generate) / 1-19 (correct): "최소 X자 이상" (error)
- [ ] 글자수 10-50: "조금 더 자세히" (info)
- [ ] 글자수 450+: "X자 남았어요" (warning)

---

## ~~Task 3: 최소 글자수 검증 강화~~ (스킵됨)

### 배경

현재 validation은 있지만, 사용자가 버튼을 눌러봐야 알 수 있습니다. CTA 버튼 비활성화로 더 명확하게 만듭니다.

### 구현 방법

**홈 화면 수정**

파일: `src/pages/index.tsx`

```tsx
const isValid = useMemo(() => {
  if (scenario === null) return false;

  const minLength = mode === 'generate' ? 10 : 20;
  return text.length >= minLength;
}, [mode, scenario, text]);
```

**검증**

- [ ] scenario 미선택: CTA 비활성화
- [ ] generate 모드 + 10자 미만: CTA 비활성화
- [ ] correct 모드 + 20자 미만: CTA 비활성화
- [ ] 조건 충족: CTA 활성화

---

## Task 4: 테스트 및 검증

### E2E 테스트 시나리오

**시나리오 1: 메시지 생성 플로우**
1. 홈 화면 진입
2. "메시지 생성" 탭 선택
3. 시나리오 선택 (예: 자녀)
4. 톤 선택 (예: 부드럽게)
5. 상황 설명 입력 (10자 이상)
6. "생성하기" 버튼 클릭
7. loading 화면 → 광고 표시
8. suggestion 화면으로 이동
9. 생성된 메시지 3개 확인
10. 복사 버튼 동작 확인

**시나리오 2: 말투 교정 플로우**
1. 홈 화면 진입
2. "말투 교정" 탭 선택
3. 시나리오 선택 (예: 상사)
4. 톤 선택 (예: 격식있게)
5. 교정할 문장 입력 (20자 이상)
6. "교정하기" 버튼 클릭
7. loading 화면 → 광고 표시
8. suggestion 화면으로 이동
9. overall 점수 + diagnosis 확인
10. 교정된 문장 3개 확인
11. "분석 결과 자세히 보기" 버튼 클릭
12. result 화면으로 이동
13. 상세 분석 점수 5개 카테고리 확인

**검증 항목**
- [ ] 동적 플레이스홀더 업데이트
- [ ] 동적 힌트 표시
- [ ] 최소 글자수 검증
- [ ] CTA 버튼 활성화/비활성화
- [ ] mode 변경 시 텍스트 초기화
- [ ] 백엔드 API 정상 응답
- [ ] 결과 화면 정상 표시

---

## Task 5: 버그 수정 및 개선

### 알려진 이슈

1. **scenario null 처리**
   - 현재: `scenario: scenario!` (non-null assertion)
   - 개선: scenario가 null일 수 없도록 CTA 비활성화로 보장

2. **로딩 상태 개선**
   - 백엔드 응답 속도가 빠를 때 사용자 혼란 가능
   - 최소 로딩 시간 보장 검토

3. **에러 처리**
   - 백엔드 에러 시 사용자 친화적 메시지 표시
   - 네트워크 에러 재시도 로직

---

## Phase 4 이후 계획

### Phase 5: 추가 기능

1. **분석 결과 저장/공유**
   - 결과 히스토리 저장
   - 공유 기능

2. **고급 설정**
   - 사용자 커스텀 시나리오
   - 말투 커스터마이징

3. **통계 및 인사이트**
   - 사용 패턴 분석
   - 개인화된 제안

### Phase 6: 성능 최적화

1. **프론트엔드 최적화**
   - 컴포넌트 memoization
   - 번들 사이즈 최적화

2. **백엔드 최적화**
   - OpenAI API 응답 속도 개선
   - 캐싱 전략

---

## 구현 순서 요약

```
Phase 4 구현 순서:
1. Task 1: 동적 플레이스홀더 (1-2시간)
   └─> placeholders.ts 생성 → index.tsx 적용 → 검증

2. Task 2: 동적 힌트 (2-3시간)
   └─> useInputHint.ts 생성 → index.tsx 적용 → 검증

3. Task 3: 최소 글자수 검증 강화 (30분)
   └─> isValid 로직 수정 → 검증

4. Task 4: E2E 테스트 (2-3시간)
   └─> 시나리오 1 → 시나리오 2 → 검증 항목 체크

5. Task 5: 버그 수정 및 개선 (가변)
   └─> 이슈별로 우선순위 정해서 수정
```

---

## 다음 세션 시작 시

### 컨텍스트 요약

**현재 완료 상태:**
- ✅ v2 백엔드 API (generate/correct 모드)
- ✅ v2 프론트엔드 UI (Tab, SelectorField, ExampleBottomSheet)
- ✅ 프론트엔드-백엔드 연결 완료 (loading/index.tsx)
- ✅ 결과 화면 v2 지원 (result, suggestion)

**다음 작업:**
- Phase 4: 동적 기능 구현
- 시작점: Task 1 (동적 플레이스홀더)

### 실행 명령

```bash
# 현재 브랜치 확인
git status

# 최근 커밋 확인
git log --oneline -5

# 개발 서버 실행
npm run dev

# 타입 체크
npm run typecheck
```

### 주요 파일 위치

```
tone-checker/
├── src/
│   ├── pages/
│   │   ├── index.tsx          # 홈 화면 (v2)
│   │   ├── loading/index.tsx  # 로딩 페이지 (v2 연결됨)
│   │   ├── result/index.tsx   # 결과 페이지 (correct 모드)
│   │   └── suggestion/index.tsx # 제안 페이지 (generate/correct)
│   ├── components/
│   │   ├── common/
│   │   │   ├── SelectBottomSheet.tsx  # 시나리오/톤 선택
│   │   │   ├── ExampleBottomSheet.tsx # 예시 문장
│   │   │   └── SelectorField.tsx      # 선택 필드
│   │   └── home/
│   │       ├── UsageLimitNotice.tsx
│   │       ├── AnalysisBottomSheet.tsx
│   │       └── AdBottomSheet.tsx
│   ├── constants/
│   │   ├── params.ts          # Mode, Scenario, Tone 정의
│   │   └── exampleMessages.ts # 예시 상황 설명
│   ├── api/
│   │   └── analyze.ts         # analyzeToneV2 함수
│   └── stores/
│       └── form.ts            # v2 form store (mode, scenario, tone)
├── supabase/functions/analyze-tone/
│   ├── index.ts               # v2 API 엔드포인트
│   ├── lib/
│   │   ├── systemGenerate.ts  # 메시지 생성 프롬프트
│   │   └── systemCorrect.ts   # 말투 교정 프롬프트
└── docs/plans/
    └── 2026-02-16-phase4-dynamic-features.md  # 이 파일
```
