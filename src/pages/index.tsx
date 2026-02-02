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
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRemainingUsage } from 'hooks/useRemainingUsage';
import { AdBottomSheet } from 'components/AdBottomSheet';
import { UsageLimitNotice } from 'components/UsageLimitNotice';
import { ErrorResult } from 'components/ErrorResult';
import { useAdStore } from 'stores/ad';
import { useResultStore } from 'stores/result';
import { AnalysisBottomSheet } from 'components/AnalysisBottomSheet';
import { ENDPOINT } from 'constants/endpoint';
import { getRemainingUsage } from 'api/usage';

export const Route = createRoute('/', {
  component: Page,
});

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
  const [toast, setToast] = useState({ open: false, message: '' });
  const [adBottomSheetOpen, setAdBottomSheetOpen] = useState(false);
  const [analysisBottomSheetOpen, setAnalysisBottomSheetOpen] = useState(false);

  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);

  const loadAd = useAdStore((s) => s.loadAd);
  const setDeviceId = useFormStore((s) => s.setDeviceId);
  const setRelationship = useFormStore((s) => s.setRelationship);
  const setSituation = useFormStore((s) => s.setSituation);
  const setText = useFormStore((s) => s.setText);
  const resetForm = useFormStore((s) => s.reset);
  const clearResult = useResultStore((s) => s.clearResult);

  const qc = useQueryClient();
  const navigation = useNavigation();
  const { data } = useSuspenseQuery({ ...useRemainingUsage(deviceId) });

  const remainingTotal = data.remaining_total;
  const hasLimit = data.has_limit;
  const rewardChargeRemaining = data.reward_charge_remaining;
  const isChargeable = remainingTotal === 0 && rewardChargeRemaining > 0;

  const executeAnalyze = useCallback(() => {
    const isTextTooShort = text.length < 20;

    Keyboard.dismiss();

    if (isChargeable) {
      setAdBottomSheetOpen(true);
      return;
    }
    if (isTextTooShort) {
      setToast({ open: true, message: '최소 20자 이상 입력해주세요.' });
      return;
    }
    setAnalysisBottomSheetOpen(true);
  }, [text, navigation]);

  useEffect(() => {
    const adGroupId = __DEV__
      ? isChargeable
        ? import.meta.env.REWARD_AD_DEV_ID
        : import.meta.env.DISPLAY_AD_DEV_ID
      : isChargeable
        ? import.meta.env.REWARD_AD_ID
        : import.meta.env.DISPLAY_AD_ID;

    loadAd(adGroupId);
  }, [isChargeable, loadAd]);

  useEffect(() => {
    setDeviceId(deviceId);

    const queryKey = [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] as const;

    const onFocus = async () => {
      try {
        await qc.fetchQuery({
          queryKey,
          queryFn: () => getRemainingUsage(deviceId),
        });
      } catch {
        qc.invalidateQueries({ queryKey });
      }
      clearResult?.();
    };

    const unsubscribeFocus = navigation.addListener('focus', onFocus);
    const unsubscribe = navigation.addListener('blur', () => Keyboard.dismiss());

    if (navigation.isFocused && navigation.isFocused()) {
      onFocus();
    }

    return () => {
      unsubscribeFocus();
      unsubscribe();
    };
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

          {isChargeable && (
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

      {toast.open && (
        <Toast
          open={toast.open}
          onClose={() => setToast({ open: false, message: '' })}
          position="bottom"
          text={toast.message}
          icon={<Toast.LottieIcon preset type="error" />}
        />
      )}

      <AdBottomSheet
        deviceId={deviceId}
        rewardChargeRemaining={rewardChargeRemaining}
        open={adBottomSheetOpen}
        onClose={() => setAdBottomSheetOpen(false)}
        onFailedToShow={() => {
          setAdBottomSheetOpen(false);
          setToast({ open: true, message: '광고 로드에 실패했습니다. 다시 시도해주세요.' });
        }}
      />
      <AnalysisBottomSheet
        open={analysisBottomSheetOpen}
        onClose={() => setAnalysisBottomSheetOpen(false)}
        onAnalyze={() => {
          setAnalysisBottomSheetOpen(false);
          navigation.push('/loading');
        }}
      />
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
