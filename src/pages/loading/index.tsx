import { createRoute, useNavigation } from '@granite-js/react-native';
import { ConfirmDialog, Loader, Result } from '@toss/tds-react-native';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useBackEvent } from '@granite-js/react-native';
import { useOverlay } from '@apps-in-toss/framework';
import { useFormStore } from 'stores/form';

export const Route = createRoute('/loading', {
  component: Page,
});

function Page() {
  const relationship = useFormStore((s) => s.relationship);
  const situation = useFormStore((s) => s.situation);
  const text = useFormStore((s) => s.text);
  const resetForm = useFormStore((s) => s.reset);

  const overlay = useOverlay();
  const backEvent = useBackEvent();
  const navigation = useNavigation();

  useEffect(() => {
    setTimeout(() => {
      resetForm();
      navigation.replace('/suggestion');
    }, 1000);
  }, []);

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
