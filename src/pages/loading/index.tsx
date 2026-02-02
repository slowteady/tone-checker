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
import { useAdStore } from 'stores/ad';
import { ENDPOINT } from 'constants/endpoint';

export const Route = createRoute('/loading', {
  component: Page,
});

function Page() {
  const deviceId = useFormStore((s) => s.deviceId);
  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);
  const resetForm = useFormStore((s) => s.reset);

  const setAnalysisResult = useResultStore((s) => s.setAnalysisResult);

  const adLoadStatus = useAdStore((s) => s.adLoadStatus);
  const showAd = useAdStore((s) => s.showAd);

  const qc = useQueryClient();
  const overlay = useOverlay();
  const backEvent = useBackEvent();
  const navigation = useNavigation();

  const hasMovedRef = useRef(false);

  const moveToResult = useCallback(() => {
    if (hasMovedRef.current) return;
    hasMovedRef.current = true;

    resetForm();
    navigation.replace('/result');
  }, [resetForm, navigation]);

  const [analysisDone, setAnalysisDone] = useState(false);
  const [adDone, setAdDone] = useState(false);

  const hasTriedShowAdRef = useRef(false);

  const { mutate } = useMutation({
    mutationFn: () =>
      analyzeTone({
        device_id: deviceId,
        text,
        relationship,
        situation,
        platform: Platform.OS,
      }),
    onSuccess: async (data) => {
      setAnalysisResult(data);
      qc.invalidateQueries({ queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] });

      setAnalysisDone(true);
    },
    throwOnError: true,
  });

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

  // ✅ 1) 분석 요청은 최초 1회만
  useEffect(() => {
    mutate();
  }, [mutate]);

  // ✅ 2) 광고 처리: “뜨면 닫힐 때까지 기다림”, “못 뜨면 즉시 adDone”
  useEffect(() => {
    // 이미 광고 show를 시도했으면 재시도 금지
    if (hasTriedShowAdRef.current) return;

    // adLoadStatus가 결정되기 전(not_loaded)은 그냥 대기
    if (adLoadStatus === 'not_loaded') return;

    hasTriedShowAdRef.current = true;

    if (adLoadStatus === 'loaded') {
      showAd({
        onDismissed: () => {
          setAdDone(true);
        },
      });
      return;
    }

    // failed면 광고를 못 띄운거니까 바로 adDone 처리
    if (adLoadStatus === 'failed') {
      setAdDone(true);
    }
  }, [adLoadStatus, showAd]);

  // ✅ 3) 이동 조건: (분석 완료 && 광고 완료) -> 이동
  useEffect(() => {
    if (analysisDone && adDone) {
      moveToResult();
    }
  }, [analysisDone, adDone, moveToResult]);

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
