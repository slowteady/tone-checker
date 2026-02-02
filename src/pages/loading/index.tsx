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
  const [isAdDismissed, setIsAdDismissed] = useState(false);
  const hasFetched = useRef(false);

  const deviceId = useFormStore((s) => s.deviceId);
  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);

  const qc = useQueryClient();

  const setAnalysisResult = useResultStore((s) => s.setAnalysisResult);
  const adLoadStatus = useAdStore((s) => s.adLoadStatus);
  const showAd = useAdStore((s) => s.showAd);
  const resetForm = useFormStore((s) => s.reset);

  const overlay = useOverlay();
  const backEvent = useBackEvent();
  const navigation = useNavigation();

  const moveToResult = useCallback(() => {
    resetForm();
    navigation.replace('/result');
  }, [resetForm, navigation]);

  const { mutate, isSuccess } = useMutation({
    mutationFn: () =>
      analyzeTone({
        device_id: deviceId,
        text,
        relationship,
        situation,
        platform: Platform.OS,
      }),
    onSuccess: (data) => {
      setAnalysisResult(data);
      qc.invalidateQueries({ queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] });
      if (isAdDismissed) moveToResult();
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
    if (openConfirmDialog != null) {
      backEvent.addEventListener(openConfirmDialog);

      return () => {
        backEvent.removeEventListener(openConfirmDialog);
      };
    }

    return;
  }, [backEvent, openConfirmDialog]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;

      mutate();

      if (adLoadStatus === 'loaded') {
        showAd({
          onDismissed: () => {
            setIsAdDismissed(true);
            if (isSuccess) moveToResult();
          },
        });
      } else if (adLoadStatus === 'failed') {
        setIsAdDismissed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current && adLoadStatus === 'loaded' && !isAdDismissed) {
      showAd({
        onDismissed: () => {
          setIsAdDismissed(true);
          if (isSuccess) moveToResult();
        },
      });
    }
  }, [adLoadStatus, isAdDismissed, isSuccess, showAd, moveToResult]);

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
