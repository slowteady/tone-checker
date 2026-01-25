import { createRoute } from '@granite-js/react-native';
import { Txt } from '@toss/tds-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@toss/tds-colors';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  return (
    <View style={styles.container}>
      <View style={{ marginBottom: 24 }}>
        <Txt typography="t1" fontWeight="bold">
          말투의 온도,
        </Txt>
        <Txt typography="t1" fontWeight="bold">
          AI가 점검해드릴게요
        </Txt>
      </View>
      <Txt typography="st9" style={{ color: colors.grey700 }}>
        하루 3회 무료로 대화의 톤을 체크해보세요.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
});
