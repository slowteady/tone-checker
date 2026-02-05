import { createRoute, useNavigation } from '@granite-js/react-native';
import { ConfirmDialog, Loader, Result } from '@toss/tds-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useBackEvent } from '@granite-js/react-native';
import { GoogleAdMob, useOverlay } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeTone } from 'api/analyze';
import { useResultStore } from 'stores/result';
import { ENDPOINT } from 'constants/endpoint';
import { UsageInfoDto } from 'lib/schema';
import { useDeviceIdStore } from 'stores/device';
import { captureError } from 'lib/sentry';
import { createAdFlowLogger } from 'lib/adSentry';

export const Route = createRoute('/loading', {
  component: Page,
});

const AD_TIMEOUT_MS = 5_000;

function Page() {
  const [analysisDone, setAnalysisDone] = useState(false);
  const [adDismissed, setAdDismissed] = useState(false);
  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const deviceId = useDeviceIdStore((s) => s.deviceId);

  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);
  const resetForm = useFormStore((s) => s.reset);

  const setAnalysisResult = useResultStore((s) => s.setAnalysisResult);

  const qc = useQueryClient();
  const overlay = useOverlay();
  const backEvent = useBackEvent();
  const navigation = useNavigation();

  const queryKey = [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] as const;

  const { mutate } = useMutation({
    mutationFn: () =>
      analyzeTone({
        device_id: deviceId,
        text,
        relationship,
        situation,
        platform: Platform.OS,
      }),
    onMutate: async () => {
      // optimistic update
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);

      qc.setQueryData<UsageInfoDto>(queryKey, (prev) => {
        if (!prev) return prev;

        const nextTotal = Math.max(prev.remaining_total - 1, 0);

        let nextFree = prev.remaining_free;
        let nextRewarded = prev.remaining_rewarded;

        if (prev.remaining_free > 0) {
          nextFree = Math.max(prev.remaining_free - 1, 0);
        } else if (prev.remaining_rewarded > 0) {
          nextRewarded = Math.max(prev.remaining_rewarded - 1, 0);
        }

        return {
          ...prev,
          remaining_total: nextTotal,
          remaining_free: nextFree,
          remaining_rewarded: nextRewarded,
          has_limit: nextTotal <= 0,
        };
      });

      return { previous };
    },
    onSuccess: async (data) => {
      setAnalysisResult(data);
      setAnalysisDone(true);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      captureError(_err, { location: 'loading/mutate', tags: { feature: 'analyze' } });
      setAnalysisDone(true);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey });
    },
  });

  const loadAndShowAd = useCallback(() => {
    const adGroupId = __DEV__ ? import.meta.env.DISPLAY_AD_DEV_ID : import.meta.env.DISPLAY_AD_ID;

    const log = createAdFlowLogger({
      kind: 'interstitial',
      screen: 'loading',
      placement: 'analyze-loading',
      deviceId,
      adGroupId,
      extraBase: {
        platform: Platform.OS,
      },
    });

    log.step('start');

    if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
      log.warn('not_supported');
      setAdDismissed(true);
      return;
    }

    let adShown = false;

    adTimeoutRef.current = setTimeout(() => {
      log.warn('timeout', { timeoutMs: AD_TIMEOUT_MS });
      if (!adShown) setAdDismissed(true);
    }, AD_TIMEOUT_MS);

    log.step('load.request');

    const cleanup = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId },
      onEvent: (event) => {
        log.step('load.event', { type: event.type });

        switch (event.type) {
          case 'loaded':
            log.info('load.loaded');
            cleanup();

            log.step('show.request');

            GoogleAdMob.showAppsInTossAdMob({
              options: { adGroupId },
              onEvent: (showEvent) => {
                switch (showEvent.type) {
                  case 'show':
                    adShown = true;
                    log.info('show.shown');
                    if (adTimeoutRef.current) {
                      clearTimeout(adTimeoutRef.current);
                      adTimeoutRef.current = null;
                    }
                    break;
                  case 'dismissed':
                    log.info('show.dismissed');
                    setAdDismissed(true);
                    break;
                  case 'failedToShow':
                    log.warn('show.failedToShow');
                    setAdDismissed(true);
                    break;
                }
              },
              onError: (error) => {
                log.error(error, 'show.onError');
                setAdDismissed(true);
              },
            });
            break;
        }
      },
      onError: (error) => {
        log.error(error, 'load.onError');
        cleanup?.();
        setAdDismissed(true);
      },
    });
  }, []);

  useEffect(() => {
    mutate();
    loadAndShowAd();

    return () => {
      if (adTimeoutRef.current) {
        clearTimeout(adTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (adDismissed && analysisDone) {
      resetForm();
      navigation.replace('/result');
    }
  }, [adDismissed, analysisDone, navigation]);

  const openConfirmDialog = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      overlay.open(({ isOpen, close, exit }: { isOpen: boolean; close: () => void; exit: () => void }) => (
        <ConfirmDialog
          open={isOpen}
          title="분석이 진행 중이에요"
          description={'지금 나가시면 결과를 확인할 수 없어요.\n사용 횟수 또한 차감될 수 있어요.'}
          leftButton={
            <ConfirmDialog.Button
              style="weak"
              type="dark"
              pointerEvents="auto"
              onPress={() => {
                resolve(false);
                close();
              }}
            >
              취소
            </ConfirmDialog.Button>
          }
          rightButton={
            <ConfirmDialog.Button
              type="danger"
              pointerEvents="auto"
              onPress={() => {
                navigation.pop();
                resolve(true);
                close();
              }}
            >
              나가기
            </ConfirmDialog.Button>
          }
          onClose={() => {
            resolve(false);
            close();
          }}
          onExited={exit}
        />
      ));
    });
  }, [overlay]);

  useEffect(() => {
    backEvent.addEventListener(openConfirmDialog);
    return () => backEvent.removeEventListener(openConfirmDialog);
  }, [backEvent, openConfirmDialog]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Result
        figure={<Loader size="large" style={{ marginBottom: 16 }} />}
        title="AI가 열심히 분석중이에요"
        description="잠시만 기다려주시면 결과를 출력해드릴게요."
      />
    </View>
  );
}
