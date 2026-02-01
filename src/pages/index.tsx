import { createRoute, Flex, useNavigation } from '@granite-js/react-native';
import {
  Asset,
  FixedBottomCTA,
  FixedBottomCTAProvider,
  Loader,
  SegmentedControl,
  TextArea,
  Toast,
  Txt,
} from '@toss/tds-react-native';
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { colors } from '@toss/tds-colors';
import { RELATIONSHIP_OPTIONS, SITUATION_OPTIONS, type Relationship, type Situation } from 'constants/params';
import { getDeviceId } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useRemainingUsage } from 'hooks/useRemainingUsage';
import { AdBottomSheet } from 'components/AdBottomSheet';
import { UsageLimitNotice } from 'components/UsageLimitNotice';
import { useLoadAd } from 'hooks/useLoadAd';
import { ErrorResult } from 'components/ErrorResult';

export const Route = createRoute('/', {
  component: Page,
});

// TODO
// 1. 루트 페이지
// [x] 남은 횟수 조회
// [x] 횟수 있을 때, 전면 광고 preload 처리
// [x] 횟수 없을 때, 보상형 광고 preload 처리
// [ ] 분석하기 버튼 클릭하면 광고 꺼내고 /loading 페이지 이동

// 2. loading 페이지
// [ ] 전면 광고 출력
// [ ] 데이터 패칭 후에 스토어에 담고 /result 페이지 이동

// 3. result 페이지
// [ ] 스토어에서 데이터 가져와서 뿌려주기
// [ ] UI 구현
// [ ] 개선된 문장 확인하기 버튼 클릭하면 /suggestion 페이지 이동

// 4. suggestion 페이지
// [ ] 스토어에서 데이터 가져와서 뿌려주기
// [ ] 홈으로 돌아가기 버튼 클릭하면 루트 페이지 이동

function Page() {
  const [hasError, setHasError] = useState(false);
  const deviceId = getDeviceId();

  const handleRetry = () => {
    setHasError(false);
  };

  if (!deviceId || hasError) {
    return <ErrorResult onRetry={handleRetry} />;
  }

  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Loader />
        </View>
      }
    >
      <Home deviceId={deviceId} />
    </Suspense>
  );
}

function Home({ deviceId }: { deviceId: string }) {
  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);

  const setDeviceId = useFormStore((s) => s.setDeviceId);
  const setRelationship = useFormStore((s) => s.setRelationship);
  const setSituation = useFormStore((s) => s.setSituation);
  const setText = useFormStore((s) => s.setText);
  const resetForm = useFormStore((s) => s.reset);

  const [toastOpen, setToastOpen] = useState(false);
  const [adBottomSheetOpen, setAdBottomSheetOpen] = useState(false);
  const navigation = useNavigation();

  const { data } = useSuspenseQuery({ ...useRemainingUsage(deviceId) });

  const hasLimit = data.has_limit;
  const remainingTotal = data.remaining_total;

  useLoadAd(hasLimit ? import.meta.env.DISPLAY_AD_DEV_ID : import.meta.env.REWARD_AD_DEV_ID);

  const executeAnalyze = useCallback(() => {
    const isTextTooShort = text.length < 20;

    if (isTextTooShort) {
      setToastOpen(true);
      return;
    }

    navigation.push('/loading');
  }, [text, navigation]);

  useEffect(() => {
    setDeviceId(deviceId);

    const unsubscribe = navigation.addListener('blur', () => {
      Keyboard.dismiss();
    });

    return unsubscribe;
  }, [navigation, resetForm, setDeviceId, deviceId]);

  return (
    <>
      <FixedBottomCTAProvider wrapperProps={{ automaticallyAdjustKeyboardInsets: true }}>
        <View style={styles.contentContainer}>
          <Txt typography="t1" fontWeight="bold" style={{ marginBottom: 16 }}>
            {`AI가 상황에 맞게\n말투를 다듬어드려요`}
          </Txt>

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

          {hasLimit && (
            <View style={{ marginBottom: 24 }}>
              <UsageLimitNotice onWatchAd={() => setAdBottomSheetOpen(true)} />
            </View>
          )}

          <Flex direction="column" style={{ marginBottom: 24 }}>
            <Txt typography="t6" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 8 }}>
              누구에게 보내나요?
            </Txt>
            <SegmentedControl.Root
              value={relationship}
              onChange={(value) => setRelationship(value as Relationship)}
              name="relationship"
              style={{ paddingHorizontal: 0 }}
            >
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <SegmentedControl.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          </Flex>

          <Flex direction="column" style={{ marginBottom: 24 }}>
            <Txt typography="t6" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 8 }}>
              어떤 분위기인가요?
            </Txt>
            <SegmentedControl.Root
              value={situation}
              onChange={(value) => setSituation(value as Situation)}
              name="situation"
              style={{ paddingHorizontal: 0 }}
            >
              {SITUATION_OPTIONS.map((opt) => (
                <SegmentedControl.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          </Flex>

          <View style={{ position: 'relative' }}>
            <TextArea
              placeholder={`상대에게 보내고 싶은 문장을 입력해 주세요.`}
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
                    {`최소 20자 이상 입력해주세요.`}
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

          <FixedBottomCTA onPress={executeAnalyze} disabled={hasLimit}>
            <Txt typography="t6" fontWeight="bold" color={colors.white}>
              분석하기
            </Txt>
          </FixedBottomCTA>
        </View>
      </FixedBottomCTAProvider>

      {toastOpen && (
        <Toast
          open={toastOpen}
          onClose={() => setToastOpen(false)}
          position="bottom"
          text="최소 20자 이상 입력해주세요."
          icon={<Toast.LottieIcon preset type="error" />}
        />
      )}

      <AdBottomSheet open={adBottomSheetOpen} onClose={() => setAdBottomSheetOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.grey100,
    alignItems: 'center',
    alignSelf: 'baseline',
    borderRadius: 9999,
  },
  indicator: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
