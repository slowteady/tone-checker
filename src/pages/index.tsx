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
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { colors } from '@toss/tds-colors';
import { RELATIONSHIP_OPTIONS, SITUATION_OPTIONS, type Relationship, type Situation } from 'constants/params';
import { getDeviceId, GoogleAdMob, useOverlay } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRemainingUsage } from 'hooks/useRemainingUsage';
import { UsageLimitNotice } from 'components/UsageLimitNotice';
import { ErrorResult } from 'components/ErrorResult';
import { AnalysisBottomSheet } from 'components/AnalysisBottomSheet';
import { useDeviceIdStore } from 'stores/device';
import { AdBottomSheet } from 'components/AdBottomSheet';
import { rewardOnce } from 'api/usage';
import { ENDPOINT } from 'constants/endpoint';
import { captureError } from 'lib/sentry';
import { UsageInfoDto } from 'lib/schema';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const [hasError, setHasError] = useState(false);
  const deviceId = getDeviceId();

  const handleRetry = () => {
    setHasError(false);
  };

  if (!deviceId || !deviceId.trim() || hasError) {
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
  const [analysisBottomSheetOpen, setAnalysisBottomSheetOpen] = useState(false);
  const [isLoadingRewardAd, setIsLoadingRewardAd] = useState(false);

  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rewardAdGroupId = __DEV__ ? import.meta.env.REWARD_AD_DEV_ID : import.meta.env.REWARD_AD_ID;

  const setDeviceId = useDeviceIdStore((s) => s.setDeviceId);

  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);

  const setRelationship = useFormStore((s) => s.setRelationship);
  const setSituation = useFormStore((s) => s.setSituation);
  const setText = useFormStore((s) => s.setText);

  const qc = useQueryClient();
  const navigation = useNavigation();
  const overlay = useOverlay();

  const { data } = useSuspenseQuery({ ...useRemainingUsage(deviceId) });

  const remainingTotal = data.remaining_total;
  const hasLimit = data.has_limit;
  const rewardChargeRemaining = data.reward_charge_remaining;
  const isChargeable = remainingTotal === 0 && rewardChargeRemaining > 0;

  const { mutateAsync: chargeReward } = useMutation({
    mutationFn: () => rewardOnce(deviceId),
    onMutate: async () => {
      // Optimistic update
      const queryKey = [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);

      qc.setQueryData<UsageInfoDto>(queryKey, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          remaining_rewarded: Math.min(prev.remaining_rewarded + 1, prev.rewarded_limit),
          remaining_total: prev.remaining_total + 1,
          reward_charge_remaining: Math.max(prev.reward_charge_remaining - 1, 0),
        };
      });

      return { previous };
    },
    onSuccess: (data) => {
      qc.setQueryData<UsageInfoDto>([ENDPOINT.RPC_GET_TODAY_STATUS, deviceId], (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          reward_charge_remaining: data.reward_charge_remaining,
        };
      });

      setToast({ open: true, message: '분석 횟수 1회가 충전되었어요!' });
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData([ENDPOINT.RPC_GET_TODAY_STATUS, deviceId], context.previous);
      }

      captureError(error, {
        location: 'Home/chargeReward',
        tags: { feature: 'usage' },
      });

      if (error instanceof Error && error.message === 'REWARD_LIMIT_EXCEEDED') {
        setToast({ open: true, message: '오늘 충전 가능 횟수를 모두 사용했어요.' });
      } else {
        setToast({ open: true, message: '충전에 실패했어요. 다시 시도해주세요.' });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] });
    },
  });

  const watchAd = useCallback(() => {
    if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
      setToast({ open: true, message: '광고를 불러올 수 없어요.' });
      return;
    }

    setIsLoadingRewardAd(true);

    let adShown = false;
    let rewardEarned = false;

    adTimeoutRef.current = setTimeout(() => {
      if (!adShown) {
        setIsLoadingRewardAd(false);
        setToast({ open: true, message: '광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.' });
      }
    }, 8000);

    const cleanup = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId: rewardAdGroupId },
      onEvent: (event) => {
        switch (event.type) {
          case 'loaded':
            cleanup();

            GoogleAdMob.showAppsInTossAdMob({
              options: { adGroupId: rewardAdGroupId },
              onEvent: async (showEvent) => {
                switch (showEvent.type) {
                  case 'show':
                    adShown = true;
                    if (adTimeoutRef.current) {
                      clearTimeout(adTimeoutRef.current);
                      adTimeoutRef.current = null;
                    }
                    break;
                  case 'userEarnedReward':
                    rewardEarned = true;
                    break;
                  case 'dismissed':
                    if (rewardEarned) {
                      try {
                        await chargeReward();
                      } finally {
                        setIsLoadingRewardAd(false);
                      }
                    } else {
                      setIsLoadingRewardAd(false);
                      setToast({ open: true, message: '광고를 끝까지 시청해야 충전돼요.' });
                    }
                    break;
                  case 'failedToShow':
                    setIsLoadingRewardAd(false);
                    setToast({ open: true, message: '광고를 불러오지 못했어요.' });
                    break;
                }
              },
              onError: (error) => {
                captureError(error, {
                  location: 'api/rewardOnce/catch',
                  tags: { feature: 'usage' },
                });
                setIsLoadingRewardAd(false);
                setToast({ open: true, message: '광고를 불러오지 못했어요.' });
              },
            });
            break;
        }
      },
      onError: () => {
        cleanup?.();
        setIsLoadingRewardAd(false);
        setToast({ open: true, message: '광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.' });
        if (adTimeoutRef.current) {
          clearTimeout(adTimeoutRef.current);
          adTimeoutRef.current = null;
        }
      },
    });
  }, [rewardAdGroupId, chargeReward]);

  const openAdBottomSheet = useCallback(() => {
    return new Promise<void>((resolve) => {
      overlay.open(({ isOpen, close, exit }) => {
        const handleClose = () => {
          if (isLoadingRewardAd) return;
          close();
          resolve();
        };

        const handleWatchAd = () => {
          watchAd();
          close();
          resolve();
        };

        return (
          <AdBottomSheet
            open={isOpen}
            rewardChargeRemaining={rewardChargeRemaining}
            onClose={handleClose}
            onWatchAd={handleWatchAd}
            onExited={exit}
            isLoading={isLoadingRewardAd}
          />
        );
      });
    });
  }, [overlay, rewardChargeRemaining, watchAd, isLoadingRewardAd]);

  useEffect(() => {
    return () => {
      if (adTimeoutRef.current) {
        clearTimeout(adTimeoutRef.current);
      }
    };
  }, []);

  const executeAnalyze = useCallback(async () => {
    setAnalysisBottomSheetOpen(false);
    navigation.push('/loading');
  }, [deviceId, qc, navigation]);

  const handleAnalyze = useCallback(() => {
    const isTextTooShort = text.length < 20;
    Keyboard.dismiss();

    if (isTextTooShort) {
      setToast({ open: true, message: '최소 20자 이상 입력해주세요.' });
      return;
    }
    setAnalysisBottomSheetOpen(true);
  }, [text, isChargeable, openAdBottomSheet]);

  useEffect(() => {
    setDeviceId(deviceId);
  }, [deviceId, setDeviceId]);

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
              <UsageLimitNotice onWatchAd={openAdBottomSheet} />
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

          <FixedBottomCTA onPress={handleAnalyze} disabled={hasLimit}>
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

      <AnalysisBottomSheet
        open={analysisBottomSheetOpen}
        onClose={() => setAnalysisBottomSheetOpen(false)}
        onAnalyze={executeAnalyze}
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
