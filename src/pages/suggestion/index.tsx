import { createRoute } from '@granite-js/react-native';
import { colors, FixedBottomCTA, FixedBottomCTAProvider, Txt } from '@toss/tds-react-native';
import { CopyCard } from 'components';
import { StyleSheet, View } from 'react-native';

export const Route = createRoute('/suggestion', {
  component: Page,
});

function Page() {
  return (
    <FixedBottomCTAProvider>
      <View style={styles.container}>
        <Txt typography="t3" fontWeight="bold" color={colors.grey900} style={{ marginBottom: 16 }}>
          이런 표현은 어떠세요?
        </Txt>

        <CopyCard
          label="긍정적 언어 사용"
          description="더 온화한 표현이 필요해요."
          example="안녕하세요. 지난번에도 같은 문제가 있었는데 이번에도 지연되고 있어서 아쉽습니다."
        />
      </View>

      <FixedBottomCTA>
        <Txt typography="t6" fontWeight="bold" color={colors.white}>
          홈으로 돌아가기
        </Txt>
      </FixedBottomCTA>
    </FixedBottomCTAProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
