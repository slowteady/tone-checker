# Phase 3: 홈 화면 v2 UI 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** v2 홈 화면 기본 UI 구조 구현 (Tab + BottomSheet 방식, v1 백업)

**Architecture:**
- v1 코드를 별도 폴더로 백업 후 v2로 전환
- SelectBottomSheet 공통 컴포넌트로 시나리오/톤 선택 UI 구현
- Tab 컴포넌트로 모드(생성/교정) 전환
- 동적 기능(플레이스홀더, 힌트)은 제외하고 기본 UI만 구현

**Tech Stack:**
- React Native
- TDS (@toss/tds-react-native): Tab, Button, BottomSheet
- Zustand (form store)
- TypeScript

---

## Task 1: v1 코드 백업

**Files:**
- Create: `src/components/v1/` (directory)
- Create: `src/pages/v1/` (directory)
- Copy: `src/pages/index.tsx` → `src/pages/v1/index.tsx`

**Step 1: v1 폴더 생성**

```bash
mkdir -p src/components/v1
mkdir -p src/pages/v1
```

**Step 2: 현재 홈 페이지 백업**

```bash
cp src/pages/index.tsx src/pages/v1/index.tsx
```

**Step 3: 백업 확인**

```bash
ls -la src/pages/v1/
ls -la src/components/v1/
```

Expected: v1 폴더들이 생성되고, index.tsx가 백업됨

**Step 4: git status 확인**

```bash
git status
```

Expected: 새 파일들이 untracked로 표시됨

---

## Task 2: SelectBottomSheet 공통 컴포넌트 생성

**Files:**
- Create: `src/components/common/SelectBottomSheet.tsx`

**Step 1: SelectBottomSheet 컴포넌트 작성**

파일 생성: `src/components/common/SelectBottomSheet.tsx`

```tsx
import { colors } from '@toss/tds-colors';
import { Button, Txt } from '@toss/tds-react-native';
import { useOverlay } from '@apps-in-toss/framework';
import { View, StyleSheet } from 'react-native';

export interface SelectBottomSheetProps<T extends string> {
  open: boolean;
  title: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selectedValue: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
  onExited?: () => void;
}

export function SelectBottomSheet<T extends string>({
  open,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  onExited,
}: SelectBottomSheetProps<T>) {
  const handleSelect = (value: T) => {
    onSelect(value);
    onClose();
  };

  if (!open) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Txt typography="t4" fontWeight="bold" color={colors.grey900}>
          {title}
        </Txt>
      </View>

      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;

          return (
            <Button
              key={option.value}
              onPress={() => handleSelect(option.value)}
              type={isSelected ? 'primary' : 'dark'}
              style={isSelected ? 'fill' : 'weak'}
              display="block"
              size="large"
              viewStyle={styles.optionButton}
            >
              {option.label}
            </Button>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    marginBottom: 8,
  },
});
```

**Step 2: 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 없음

**Step 3: git status 확인**

```bash
git status
```

Expected: SelectBottomSheet.tsx가 untracked로 표시됨

---

## Task 3: pages/index.tsx v2로 마이그레이션

**Files:**
- Modify: `src/pages/index.tsx` (전체 교체)

**Step 1: 기존 imports 수정**

파일: `src/pages/index.tsx`

기존 imports를 다음으로 교체:

```tsx
import { createRoute, Flex, useNavigation } from '@granite-js/react-native';
import {
  Asset,
  FixedBottomCTA,
  FixedBottomCTAProvider,
  Loader,
  Tab,
  TextArea,
  Toast,
  Txt,
  Button,
} from '@toss/tds-react-native';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { colors } from '@toss/tds-colors';
import { SCENARIO_OPTIONS, TONE_OPTIONS, type Scenario, type Tone, type Mode } from 'constants/params';
import { getDeviceId, GoogleAdMob, useOverlay } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRemainingUsage } from 'hooks/useRemainingUsage';
import { UsageLimitNotice } from 'components/home/UsageLimitNotice';
import { ErrorResult } from 'components/common/ErrorResult';
import { AnalysisBottomSheet } from 'components/home/AnalysisBottomSheet';
import { useDeviceIdStore } from 'stores/device';
import { AdBottomSheet } from 'components/home/AdBottomSheet';
import { rewardOnce } from 'api/usage';
import { ENDPOINT } from 'constants/endpoint';
import { UsageInfoDto } from 'lib/schema';
import { createAdFlowLogger } from 'lib/adSentry';
import { SelectBottomSheet } from 'components/common/SelectBottomSheet';
```

**Step 2: Home 컴포넌트 시작 부분 수정**

기존 Home 컴포넌트의 시작 부분을 다음으로 교체:

```tsx
function Home({ deviceId }: { deviceId: string }) {
  const [toast, setToast] = useState({ open: false, message: '' });
  const [analysisBottomSheetOpen, setAnalysisBottomSheetOpen] = useState(false);
  const [scenarioSheetOpen, setScenarioSheetOpen] = useState(false);
  const [toneSheetOpen, setToneSheetOpen] = useState(false);

  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rewardAdGroupId = __DEV__ ? import.meta.env.REWARD_AD_DEV_ID : import.meta.env.REWARD_AD_ID;

  const setDeviceId = useDeviceIdStore((s) => s.setDeviceId);

  // v2 form store
  const mode = useFormStore((s) => s.mode);
  const scenario = useFormStore((s) => s.scenario);
  const tone = useFormStore((s) => s.tone);
  const text = useFormStore((s) => s.text);

  const setMode = useFormStore((s) => s.setMode);
  const setScenario = useFormStore((s) => s.setScenario);
  const setTone = useFormStore((s) => s.setTone);
  const setText = useFormStore((s) => s.setText);

  const qc = useQueryClient();
  const navigation = useNavigation();
  const overlay = useOverlay();

  const { data } = useSuspenseQuery({ ...useRemainingUsage(deviceId) });

  const remainingTotal = data.remaining_total;
  const hasLimit = data.has_limit;
  const rewardChargeRemaining = data.reward_charge_remaining;
  const isChargeable = remainingTotal === 0 && rewardChargeRemaining > 0;
  const isFinished = remainingTotal === 0 && rewardChargeRemaining === 0;
```

**Step 3: Home 컴포넌트 JSX return 문 교체**

기존 return 문을 다음으로 교체:

```tsx
  const handleAnalyze = useCallback(() => {
    const isTextTooShort = text.length < 10;
    Keyboard.dismiss();

    if (isTextTooShort) {
      setToast({ open: true, message: '최소 10자 이상 입력해주세요.' });
      return;
    }
    if (scenario === null) {
      setToast({ open: true, message: '시나리오를 선택해주세요.' });
      return;
    }

    // Phase 3: 백엔드 연결 없이 console.log만
    console.log('분석 요청:', { mode, scenario, tone, text });
    setToast({ open: true, message: 'Phase 3: UI만 구현됨 (백엔드 연결 없음)' });
  }, [text, mode, scenario, tone]);

  useEffect(() => {
    setDeviceId(deviceId);
  }, [deviceId, setDeviceId]);

  const isValid = scenario !== null && text.length >= 10;

  return (
    <>
      <FixedBottomCTAProvider wrapperProps={{ automaticallyAdjustKeyboardInsets: true }}>
        <View style={styles.contentContainer}>
          {/* 헤더 */}
          <Txt typography="t1" fontWeight="bold" style={{ marginBottom: 16 }}>
            {`AI가 상황에 맞게\n말투를 다듬어드려요`}
          </Txt>

          {/* 남은 횟수 배지 */}
          <Flex direction="row" style={[styles.badge, { marginBottom: 24 }]}>
            <Asset.Icon
              name="icon-lightning-blue"
              frameShape={{ width: 18, height: 18 }}
              style={{ marginRight: 6 }}
              accessibilityLabel={'오늘 남은 횟수'}
            />
            <Txt typography="t7" fontWeight="bold" color={colors.grey500} style={{ marginRight: 4 }}>
              오늘 남은 횟수
            </Txt>
            <Txt typography="t7" fontWeight="bold" color={colors.blue900}>
              {remainingTotal}
            </Txt>
          </Flex>

          {/* 사용 한도 알림 */}
          {isChargeable && (
            <View style={{ marginBottom: 24 }}>
              <UsageLimitNotice onWatchAd={openAdBottomSheet} />
            </View>
          )}

          {isFinished && (
            <View style={[styles.notice, { marginBottom: 24 }]}>
              <Txt typography="st11" fontWeight="bold" color={colors.whiteOpacity800}>
                {`오늘 분석 횟수를 모두 사용했어요`}
              </Txt>
            </View>
          )}

          {/* 모드 탭 */}
          <View style={{ marginBottom: 24 }}>
            <Tab value={mode} onChange={(value) => setMode(value as Mode)} size="large">
              <Tab.Item value="generate">메시지 생성</Tab.Item>
              <Tab.Item value="correct">말투 교정</Tab.Item>
            </Tab>
          </View>

          {/* 시나리오 선택 */}
          <Flex direction="column" style={{ marginBottom: 24 }}>
            <Txt typography="t6" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 8 }}>
              누구에게 보내나요?
            </Txt>
            <Button
              onPress={() => setScenarioSheetOpen(true)}
              type={scenario ? 'primary' : 'dark'}
              style="weak"
              display="block"
              size="large"
            >
              {scenario
                ? SCENARIO_OPTIONS.find((o) => o.value === scenario)?.label
                : '시나리오 선택'}
            </Button>
          </Flex>

          {/* 톤 선택 */}
          <Flex direction="column" style={{ marginBottom: 24 }}>
            <Txt typography="t6" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 8 }}>
              어떤 느낌으로?
            </Txt>
            <Button
              onPress={() => setToneSheetOpen(true)}
              type="primary"
              style="weak"
              display="block"
              size="large"
            >
              {TONE_OPTIONS.find((o) => o.value === tone)?.label}
            </Button>
          </Flex>

          {/* 텍스트 입력 */}
          <View style={{ position: 'relative' }}>
            <TextArea
              placeholder="보내려는 문장을 입력해 주세요."
              value={text}
              onChangeText={setText}
              maxLength={800}
              textAreaStyle={{ height: 180, marginBottom: 20 }}
              containerStyle={{ paddingVertical: 0, paddingHorizontal: 0, marginBottom: 24 }}
              help={
                <Flex direction="row" align="center" style={{ paddingVertical: 8, width: '100%' }}>
                  <Asset.Icon
                    name="icon-info-circle-blue"
                    frameShape={{ width: 16, height: 16 }}
                    style={{ marginRight: 4 }}
                    color={colors.red500}
                    accessibilityLabel={'안내 아이콘'}
                  />
                  <Txt typography="st12" fontWeight="semiBold" color={colors.grey500}>
                    {`최소 10자 이상 입력해주세요.`}
                  </Txt>
                </Flex>
              }
            />

            <View style={styles.indicator}>
              <Txt typography="st12" fontWeight="bold" color={colors.grey500}>
                {text.length} / 800
              </Txt>
            </View>
          </View>

          <FixedBottomCTA onPress={handleAnalyze} disabled={!isValid || hasLimit}>
            <Txt typography="t6" fontWeight="bold" color={colors.white}>
              {mode === 'generate' ? '생성하기' : '교정하기'}
            </Txt>
          </FixedBottomCTA>
        </View>
      </FixedBottomCTAProvider>

      {/* Toast */}
      {toast.open && (
        <Toast
          open={toast.open}
          onClose={() => setToast({ open: false, message: '' })}
          position="bottom"
          text={toast.message}
          icon={<Toast.LottieIcon preset type="error" />}
        />
      )}

      {/* 시나리오 선택 BottomSheet */}
      {scenarioSheetOpen && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 40,
          }}
        >
          <SelectBottomSheet
            open={scenarioSheetOpen}
            title="누구에게 보내나요?"
            options={SCENARIO_OPTIONS}
            selectedValue={scenario}
            onSelect={setScenario}
            onClose={() => setScenarioSheetOpen(false)}
          />
        </View>
      )}

      {/* 톤 선택 BottomSheet */}
      {toneSheetOpen && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 40,
          }}
        >
          <SelectBottomSheet
            open={toneSheetOpen}
            title="어떤 느낌으로?"
            options={TONE_OPTIONS}
            selectedValue={tone}
            onSelect={setTone}
            onClose={() => setToneSheetOpen(false)}
          />
        </View>
      )}

      {/* 분석 BottomSheet (기존 유지) */}
      <AnalysisBottomSheet
        open={analysisBottomSheetOpen}
        onClose={() => setAnalysisBottomSheetOpen(false)}
        onAnalyze={executeAnalyze}
      />
    </>
  );
```

**Step 4: watchAd, openAdBottomSheet, executeAnalyze 함수 유지**

기존 코드의 다음 함수들은 그대로 유지:
- `chargeReward` mutation
- `watchAd` 함수
- `openAdBottomSheet` 함수
- `executeAnalyze` 함수
- `useEffect` cleanup

**Step 5: 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 없음

**Step 6: git status 확인**

```bash
git status
```

Expected: index.tsx가 modified로 표시됨

---

## Task 4: 최종 검증

**Step 1: 전체 타입 체크**

```bash
npm run typecheck
```

Expected: 타입 에러 0개

**Step 2: ESLint 검사**

```bash
npm run lint
```

Expected: src/ 폴더에서 에러 없음 (경고는 허용)

**Step 3: 변경 사항 확인**

```bash
git status
git diff --stat src/
```

Expected:
- 새 파일: src/components/common/SelectBottomSheet.tsx
- 새 파일: src/pages/v1/index.tsx
- 수정: src/pages/index.tsx

**Step 4: 개발 서버 실행 및 수동 테스트**

```bash
npm run dev
```

수동 테스트 체크리스트:
- [ ] 홈 화면이 정상적으로 렌더링됨
- [ ] Tab으로 모드 전환 가능 (생성 ↔ 교정)
- [ ] 시나리오 선택 버튼 클릭 시 BottomSheet 열림
- [ ] 시나리오 선택 시 버튼 텍스트 변경 확인
- [ ] 톤 선택 버튼 클릭 시 BottomSheet 열림
- [ ] 톤 선택 시 버튼 텍스트 변경 확인
- [ ] 텍스트 입력 가능
- [ ] 시나리오 미선택 + 텍스트 10자 미만일 때 CTA 비활성화
- [ ] 시나리오 선택 + 텍스트 10자 이상일 때 CTA 활성화
- [ ] CTA 클릭 시 Toast 메시지 표시 ("Phase 3: UI만 구현됨")
- [ ] mode에 따라 CTA 버튼 텍스트 변경 (생성하기/교정하기)

---

## 검증 기준

**UI 동작:**
- [x] Tab으로 모드 전환 가능
- [x] 시나리오 선택 BottomSheet 동작
- [x] 톤 선택 BottomSheet 동작
- [x] 텍스트 입력 가능
- [x] CTA 활성화/비활성화 조건 동작
- [x] mode별 CTA 버튼 텍스트 변경

**코드 품질:**
- [x] v1 코드가 별도 폴더로 백업됨
- [x] TypeScript 타입 체크 통과
- [x] ESLint 에러 없음 (src/ 폴더)
- [x] SelectBottomSheet 공통 컴포넌트로 재사용

**다음 단계 (Phase 4):**
- 동적 플레이스홀더 구현
- 동적 힌트 구현
- mode별 최소 글자수 검증 (generate: 10자, correct: 20자)
- 백엔드 연결

---

## 구현 노트

### BottomSheet 구현 방식

Phase 3에서는 간단한 BottomSheet를 직접 구현했습니다 (absolute positioning). 만약 TDS의 BottomSheet 컴포넌트나 @apps-in-toss/framework의 overlay 기능을 사용하고 싶다면 다음과 같이 수정할 수 있습니다:

```tsx
// overlay 사용 예시
const openScenarioSheet = useCallback(() => {
  return new Promise<void>((resolve) => {
    overlay.open(({ isOpen, close, exit }) => (
      <SelectBottomSheet
        open={isOpen}
        title="누구에게 보내나요?"
        options={SCENARIO_OPTIONS}
        selectedValue={scenario}
        onSelect={(value) => {
          setScenario(value);
          close();
        }}
        onClose={close}
        onExited={exit}
      />
    ));
  });
}, [overlay, scenario, setScenario]);
```

하지만 Phase 3에서는 간단한 구현을 우선하여 기본 View 방식을 사용했습니다.

### v1 호환성

v1 필드(relationship, situation)는 form store에 남아있지만 사용하지 않습니다. 완전히 제거하고 싶다면 나중에 stores/form.ts를 정리할 수 있습니다.

### 커밋 규칙

CLAUDE.md에 따라 사용자가 명시적으로 요청할 때까지 커밋하지 않습니다. 모든 변경사항은 unstaged 상태로 유지됩니다.
