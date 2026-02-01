import { createRoute, useNavigation } from '@granite-js/react-native';
import { ConfirmDialog, Loader, Result } from '@toss/tds-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useBackEvent } from '@granite-js/react-native';
import { useOverlay } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';
import { useMutation } from '@tanstack/react-query';
import { analyzeTone } from 'api/analyze';
import { useLoadAd } from 'hooks/useLoadAd';

export const Route = createRoute('/loading', {
  component: Page,
});

function Page() {
  const deviceId = useFormStore((s) => s.deviceId);
  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);
  const resetForm = useFormStore((s) => s.reset);

  const hasFetched = useRef(false);

  const overlay = useOverlay();
  const backEvent = useBackEvent();
  const navigation = useNavigation();

  const advertisement = useLoadAd(import.meta.env.DISPLAY_AD_DEV_ID);

  const { mutate, isPending } = useMutation({
    mutationFn: () => analyzeTone({ device_id: deviceId, text, relationship, situation, platform: Platform.OS }),
    onSuccess: (data) => {
      console.log(data);
    },
    onError: (error) => {
      console.error(error);
    },
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
    }

    if (advertisement.state.adLoadStatus === 'loaded') {
      advertisement.actions.showAd();
    }
  }, []);

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

// // stores/form.ts (또는 새로운 store)
// // API 응답 데이터를 저장할 store 추가

// // index.tsx
// const mutation = useMutation({
//   mutationFn: analyzeTone,
//   onSuccess: (data) => {
//     // store에 결과 저장
//     setAnalysisResult(data);
//   }
// });

// const executeAnalyze = useCallback(() => {
//   // 검증...

//   // 1. API 호출 시작
//   mutation.mutate({...params});

//   // 2. 광고 표시 (dismissed 이벤트에서 네비게이션)
//   if (adLoadStatus === 'loaded') {
//     showAd({
//       onDismissed: () => {
//         // 광고 종료 시점
//         if (mutation.isSuccess) {
//           // 이미 API 응답 완료 → 결과 페이지로
//           navigation.push('/result');
//         } else {
//           // 아직 진행 중 → loading 페이지로
//           navigation.push('/loading');
//         }
//       }
//     });
//   } else {
//     // 광고 없으면 바로 loading 페이지
//     navigation.push('/loading');
//   }
// }, [...]);

// // loading/index.tsx
// // store에서 데이터 확인
// const analysisResult = useFormStore((s) => s.analysisResult);

// useEffect(() => {
//   if (analysisResult) {
//     // 이미 데이터 있음 → 즉시 결과 페이지로
//     navigation.replace('/result');
//   } else {
//     // 데이터 없음 → 여기서 API 호출
//     mutate();
//   }
// }, []);
