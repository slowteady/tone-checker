import { colors } from '@toss/tds-colors';
import { createRoute } from '@granite-js/react-native';
import { Progressbar } from 'components';
import { StyleSheet, View } from 'react-native';

export const Route = createRoute('/result', {
  component: Page,
});

// TODO
// [ ] 결과 데이터 조회

function Page() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Progressbar score={80} />
      </View>
    </View>
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
