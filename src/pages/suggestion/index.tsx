import { createRoute, useNavigation } from '@granite-js/react-native';
import { colors, FixedBottomCTA, FixedBottomCTAProvider, Txt } from '@toss/tds-react-native';
import { StyleSheet, View } from 'react-native';
import { CopyCard } from 'components/CopyCard';
import { useResultStore } from 'stores/result';

export const Route = createRoute('/suggestion', {
  component: Page,
});

function Page() {
  const result = useResultStore((s) => s.analysisResult)?.data;
  if (!result) return null;

  const navigation = useNavigation();
  const suggestions = result.suggestions;

  return (
    <FixedBottomCTAProvider>
      <View style={styles.container}>
        <Txt typography="t3" fontWeight="bold" color={colors.grey900} style={{ marginBottom: 16 }}>
          이런 표현은 어떠세요?
        </Txt>

        {suggestions.map((suggestion, index) => (
          <View key={index} style={{ marginBottom: 16 }}>
            <CopyCard label={suggestion.label} description={suggestion.description} example={suggestion.example} />
          </View>
        ))}
      </View>

      <FixedBottomCTA onPress={() => navigation.popToTop()}>
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
