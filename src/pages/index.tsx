import { createRoute, Flex, Stack, useNavigation } from '@granite-js/react-native';
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
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@toss/tds-colors';
import { SCENARIO_OPTIONS, TONE_OPTIONS, type Mode } from 'constants/params';
import { getDeviceId, GoogleAdMob, useOverlay } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRemainingUsage } from 'hooks/useRemainingUsage';
import { useBottomSheet } from 'hooks/useBottomsheet';
import { UsageLimitNotice } from 'components/home/UsageLimitNotice';
import { ErrorResult } from 'components/common/ErrorResult';
import { AnalysisBottomSheet } from 'components/home/AnalysisBottomSheet';
import { useDeviceIdStore } from 'stores/device';
import { AdBottomSheet } from 'components/home/AdBottomSheet';
import { rewardOnce } from 'api/usage';
import { ENDPOINT } from 'constants/endpoint';
import { UsageInfoDto } from 'lib/schema';
import { createAdFlowLogger } from 'lib/adSentry';
import { SelectorField } from 'components/common/SelectorField';
import { ExampleBottomSheet } from 'components/common/ExampleBottomSheet';
import { getExampleMessages } from 'constants/exampleMessages';

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

  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rewardAdGroupId = __DEV__ ? import.meta.env.REWARD_AD_DEV_ID : import.meta.env.REWARD_AD_ID;

  const setDeviceId = useDeviceIdStore((s) => s.setDeviceId);

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
  const isValid = useMemo(() => {
    return mode === 'generate' ? text.length >= 10 : text.length >= 20;
  }, [mode, text]);

  const { mutateAsync: chargeReward } = useMutation({
    mutationFn: () => rewardOnce(deviceId),
    onMutate: async () => {
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

  const watchAd = useCallback(
    (opts: { onClose: () => void; setLoading: (v: boolean) => void }) => {
      const { onClose, setLoading } = opts;

      const log = createAdFlowLogger({
        kind: 'rewarded',
        screen: 'home',
        placement: 'usage-charge',
        deviceId,
        adGroupId: rewardAdGroupId,
        extraBase: { rewardChargeRemaining },
      });

      let finished = false;
      let timedOut = false;
      let adShown = false;
      let rewardEarned = false;

      const finalize = (opts?: { close?: boolean; reason?: string; extra?: Record<string, unknown> }) => {
        if (finished) return;
        finished = true;

        if (adTimeoutRef.current) {
          clearTimeout(adTimeoutRef.current);
          adTimeoutRef.current = null;
        }

        setLoading(false);
        if (opts?.reason) log.finish(opts.reason, opts.extra);
        if (opts?.close) onClose();
      };

      setLoading(true);

      if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
        setToast({ open: true, message: '이 환경에서는 광고를 지원하지 않아요.' });
        finalize({ close: true, reason: 'not_supported' });
        return;
      }

      const TIMEOUT_MS = 8000;
      adTimeoutRef.current = setTimeout(() => {
        if (finished) return;
        if (adShown) return;

        timedOut = true;
        setToast({ open: true, message: '네트워크 연결을 확인해주세요.' });
        finalize({ close: true, reason: 'timeout' });
      }, TIMEOUT_MS);

      const cleanup = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId: rewardAdGroupId },

        onEvent: (event) => {
          if (finished || timedOut) return;

          switch (event.type) {
            case 'loaded': {
              cleanup?.();

              GoogleAdMob.showAppsInTossAdMob({
                options: { adGroupId: rewardAdGroupId },
                onEvent: async (showEvent) => {
                  if (finished || timedOut) return;

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
                          finalize({ close: true, reason: 'rewarded_and_charged' });
                        } catch {
                          finalize({ close: true, reason: 'charge_failed' });
                        }
                      } else {
                        setToast({ open: true, message: '광고를 끝까지 시청해야 충전돼요.' });
                        finalize({ close: false, reason: 'dismissed_without_reward' });
                      }
                      break;
                    case 'failedToShow':
                      setToast({ open: true, message: '잠시 후 다시 시도해주세요.' });
                      finalize({ close: true, reason: 'failed_to_show' });
                      break;
                  }
                },
                onError: () => {
                  if (finished || timedOut) return;

                  setToast({ open: true, message: '잠시 후 다시 시도해주세요.' });
                  finalize({ close: true, reason: 'show_error' });
                },
              });

              break;
            }
            default:
              log.step('load.event', { type: event.type });
              break;
          }
        },
        onError: () => {
          if (finished) return;

          cleanup?.();

          setToast({ open: true, message: '네트워크 연결을 확인해주세요.' });
          finalize({ close: true, reason: 'load_error' });
        },
      });
    },
    [deviceId, rewardAdGroupId, rewardChargeRemaining, chargeReward]
  );

  const openAdBottomSheet = useCallback(() => {
    return new Promise<void>((resolve) => {
      overlay.open(({ isOpen, close, exit }) => {
        const Sheet = () => {
          const [loading, setLoading] = useState(false);

          const handleClose = () => {
            if (loading) return;
            close();
            resolve();
          };

          const handleWatchAd = () => watchAd({ onClose: handleClose, setLoading });

          return (
            <AdBottomSheet
              open={isOpen}
              rewardChargeRemaining={rewardChargeRemaining}
              onClose={handleClose}
              onWatchAd={handleWatchAd}
              onExited={exit}
              isLoading={loading}
            />
          );
        };

        return <Sheet />;
      });
    });
  }, [overlay, rewardChargeRemaining, watchAd]);

  const openScenarioSheet = useBottomSheet('누구에게 보내시나요?', SCENARIO_OPTIONS, scenario, setScenario);
  const openToneSheet = useBottomSheet('어떤 말투를 원하세요?', TONE_OPTIONS, tone, setTone);

  const openExampleSheet = useCallback(() => {
    const examples = getExampleMessages(scenario);

    overlay.open(({ isOpen, close, exit }) => (
      <ExampleBottomSheet
        open={isOpen}
        title="예시 문장"
        examples={examples}
        onSelect={setText}
        onClose={close}
        onExited={exit}
      />
    ));
  }, [overlay, scenario, setText]);

  const selectors = [
    {
      key: 'scenario',
      title: '누구에게 보내시나요?',
      selectedLabel: SCENARIO_OPTIONS.find((o) => o.value === scenario)?.label,
      onPress: openScenarioSheet,
    },
    {
      key: 'tone',
      title: '어떤 말투를 원하세요?',
      selectedLabel: TONE_OPTIONS.find((o) => o.value === tone)?.label,
      onPress: openToneSheet,
    },
  ] as const;

  const handleAnalyze = useCallback(() => {
    Keyboard.dismiss();

    if (!isValid) {
      setToast({
        open: true,
        message: mode === 'generate' ? '최소 10자 이상 입력해주세요.' : '최소 20자 이상 입력해주세요.',
      });
      return;
    }

    if (text.length > 500) {
      setToast({ open: true, message: '500자 이하로 입력해주세요.' });
      return;
    }

    setAnalysisBottomSheetOpen(true);
  }, [isValid, mode, text]);

  const executeAnalyze = useCallback(async () => {
    setAnalysisBottomSheetOpen(false);
    navigation.push('/loading');
  }, [navigation]);

  useEffect(() => {
    return () => {
      if (adTimeoutRef.current) {
        clearTimeout(adTimeoutRef.current);
        adTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setDeviceId(deviceId);
  }, [deviceId, setDeviceId]);

  useEffect(() => {
    setText('');
  }, [mode, setText]);

  return (
    <>
      <FixedBottomCTAProvider wrapperProps={{ automaticallyAdjustKeyboardInsets: true }}>
        <View style={[styles.contentContainer, { paddingBottom: 40 }]}>
          {/* 헤더 */}
          <Txt typography="t1" fontWeight="bold" style={{ marginBottom: 8 }}>
            {`내 말투, AI가 도와드려요`}
          </Txt>
          <Txt typography="st8" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 16 }}>
            {`AI로 메시지를 만들고 교정하세요`}
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

          {/* 모드 선택 */}
          <Stack.Vertical gutter={8} style={{ marginBottom: 24 }}>
            <Txt typography="t6" fontWeight="bold" color={colors.grey500}>
              무엇을 도와드릴까요?
            </Txt>

            <SegmentedControl.Root
              value={mode}
              onChange={(value) => setMode(value as Mode)}
              name="mode"
              style={{ paddingHorizontal: 0 }}
            >
              <SegmentedControl.Item value="generate">메시지 생성</SegmentedControl.Item>
              <SegmentedControl.Item value="correct">말투 교정</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Stack.Vertical>

          {/* 시나리오/톤 선택 Grid */}
          <Stack.Horizontal gutter={12} style={{ marginBottom: 24 }}>
            {selectors.map((selector) => (
              <SelectorField
                key={selector.key}
                title={selector.title}
                selectedLabel={selector.selectedLabel}
                onPress={selector.onPress}
              />
            ))}
          </Stack.Horizontal>

          {/* 텍스트 입력 */}
          <Stack.Vertical gutter={8} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt typography="t6" fontWeight="bold" color={colors.grey500}>
                {mode === 'generate' ? '상황을 자유롭게 설명해 주세요' : '교정할 문장을 입력해 주세요'}
              </Txt>
              {mode === 'generate' && (
                <Pressable
                  onPress={openExampleSheet}
                  style={{
                    backgroundColor: colors.grey100,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Txt typography="st11" fontWeight="semiBold" color={colors.grey600}>
                    예시 보기
                  </Txt>
                </Pressable>
              )}
            </View>

            <Stack.Vertical>
              <TextArea
                value={text}
                onChangeText={setText}
                maxLength={500}
                textAreaStyle={{ height: 200, marginBottom: 40 }}
                containerStyle={{ paddingVertical: 0, paddingHorizontal: 0, marginBottom: 24 }}
              />

              <View style={styles.indicator}>
                <Txt typography="st12" fontWeight="bold" color={colors.grey500}>
                  {text.length} / 500
                </Txt>
              </View>
            </Stack.Vertical>
          </Stack.Vertical>

          <FixedBottomCTA onPress={handleAnalyze} disabled={hasLimit}>
            <Txt typography="t6" fontWeight="bold" color={colors.white}>
              {mode === 'generate' ? '생성하기' : '교정하기'}
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
        mode={mode}
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
    bottom: 40,
    right: 20,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  notice: {
    backgroundColor: colors.greyOpacity900,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
