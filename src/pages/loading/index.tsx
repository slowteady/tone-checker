import { createRoute } from '@granite-js/react-native';
import { Loader, Result } from '@toss/tds-react-native';
import { View } from 'react-native';

export const Route = createRoute('/loading', {
  component: Page,
});

function Page() {
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
