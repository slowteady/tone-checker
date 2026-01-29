import { colors, Txt } from '@toss/tds-react-native';
import { StyleSheet, View } from 'react-native';

export const ResultCard = () => {
  return (
    <View style={styles.container}>
      <Txt>ResultCard</Txt>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: colors.background,
    borderRadius: 24,
  },
});
