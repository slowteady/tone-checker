import { createRoute, useNavigation } from '@granite-js/react-native';
import { ConfirmDialog, Loader, Result } from '@toss/tds-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useBackEvent } from '@granite-js/react-native';
import { useOverlay } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeTone } from 'api/analyze';
import { useResultStore } from 'stores/result';
import { ENDPOINT } from 'constants/endpoint';
import { UsageInfoDto } from 'lib/schema';
import { useDeviceIdStore } from 'stores/device';
import { useAd } from 'hooks/useAd';
import { withTimeout } from 'lib/withTimeout';

export const Route = createRoute('/loading', {
  component: Page,
});

function Page() {
  const [analysisDone, setAnalysisDone] = useState(false);
  const [adDone, setAdDone] = useState(false);

  const cancelledRef = useRef(false);
  const startedRef = useRef(false);

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

  const ad = useAd({
    adGroupId: __DEV__ ? import.meta.env.DISPLAY_AD_DEV_ID : import.meta.env.DISPLAY_AD_ID,
  });

  const tryMove = useCallback(() => {
    if (cancelledRef.current) return;
    if (!analysisDone) return;
    if (!adDone) return;

    resetForm();
    navigation.replace('/result');
  }, [analysisDone, adDone, navigation, resetForm]);

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
      if (cancelledRef.current) return;

      setAnalysisResult(data);
      setAnalysisDone(true);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);

      setAnalysisDone(true);
      throw new Error();
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey });
    },
  });

  const runAdPipeline = useCallback(async () => {
    await withTimeout(
      (async () => {
        const loadRes = await ad.actions.loadAd();
        if (loadRes !== 'loaded') return;
        await ad.actions.showAd();
      })(),
      5_000
    );

    ad.actions.cleanup();
    setAdDone(true);
  }, [ad.actions]);

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
                cancelledRef.current = true;
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

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    mutate();
    runAdPipeline();

    return () => {
      cancelledRef.current = true;
      ad.actions.cleanup();
      resetForm();
    };
  }, [mutate, runAdPipeline, resetForm, ad.actions]);

  useEffect(() => {
    tryMove();
  }, [tryMove]);

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
