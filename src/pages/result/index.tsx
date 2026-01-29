import { colors } from '@toss/tds-colors';
import { createRoute } from '@granite-js/react-native';
import { Progressbar } from 'components';
import { StyleSheet, View } from 'react-native';
import { FixedBottomCTA, FixedBottomCTAProvider, Txt } from '@toss/tds-react-native';

export const Route = createRoute('/result', {
  component: Page,
});

function Page() {
  return (
    <FixedBottomCTAProvider>
      <View style={styles.container}>
        <View style={styles.card}>
          <Progressbar score={80} />
        </View>
      </View>

      <FixedBottomCTA>
        <Txt typography="t6" fontWeight="bold" color={colors.white}>
          개선된 문장 확인하기
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
  card: {
    padding: 20,
    backgroundColor: colors.background,
    borderRadius: 24,
  },
});
