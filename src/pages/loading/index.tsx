import { createRoute } from '@granite-js/react-native';
import { Loader, Result } from '@toss/tds-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useBackEvent } from '@granite-js/react-native';

export const Route = createRoute('/loading', {
  component: Page,
});

function Page() {
  const backEvent = useBackEvent();

  useEffect(() => {
    const callback = () => {};

    if (callback != null) {
      backEvent.addEventListener(callback);

      return () => {
        backEvent.removeEventListener(callback);
      };
    }

    return;
  }, [backEvent]);

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
