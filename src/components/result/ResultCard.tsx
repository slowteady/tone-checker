import { Flex } from '@granite-js/react-native';
import { colors, Txt } from '@toss/tds-react-native';
import { StyleSheet, View } from 'react-native';
import { Progressbar } from './Progressbar';

export interface ResultCardProps {
  category: string;
  score: number;
  comment: string;
  detail: {
    category: string;
    score: number;
    comment: string;
  }[];
}

export const ResultCard = ({ category, score, comment, detail }: ResultCardProps) => {
  return (
    <Flex direction="column" justify="space-between">
      <Flex direction="row" align="center" justify="space-between" style={{ marginBottom: 8 }}>
        <Txt typography="t5" fontWeight="bold" color={colors.grey900}>
          {category}
        </Txt>
        <Txt typography="t6" fontWeight="bold" color={colors.grey700}>
          {score}점
        </Txt>
      </Flex>
      <View style={{ marginBottom: 8 }}>
        <Progressbar score={score} />
      </View>
      <Txt typography="st11" fontWeight="semibold" color={colors.grey700} style={{ marginBottom: 18 }}>
        {comment}
      </Txt>

      <View style={styles.border}>
        {detail.map((d, idx) => {
          const key = `${d.category}-${idx}`;
          return (
            <Flex key={key} direction="row" align="center" style={{ gap: 8 }}>
              <Txt typography="t7" fontWeight="bold" color={colors.grey900}>
                {d.category} ({d.score})
              </Txt>
              <Txt typography="st12" fontWeight="semibold" color={colors.grey700}>
                {d.comment}
              </Txt>
            </Flex>
          );
        })}
      </View>
    </Flex>
  );
};

const styles = StyleSheet.create({
  border: {
    borderLeftWidth: 2,
    borderLeftColor: colors.grey200,
    paddingLeft: 12,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
  },
});
