import { Flex } from '@granite-js/react-native';
import { colors } from '@toss/tds-colors';
import { Button, Txt } from '@toss/tds-react-native';
import { StyleSheet } from 'react-native';

export interface UsageLimitNoticeProps {
  onWatchAd: () => void;
}

export const UsageLimitNotice = ({ onWatchAd }: UsageLimitNoticeProps) => {
  return (
    <Flex direction="row" align="center" justify="space-between" style={styles.container}>
      <Txt
        typography="st11"
        color={colors.whiteOpacity800}
        fontWeight="bold"
      >{`오늘 횟수를 모두 사용했어요\n광고를 보고 1회 더 사용할 수 있어요`}</Txt>

      <Button display="block" size="tiny" onPress={onWatchAd}>
        충전하기
      </Button>
    </Flex>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.greyOpacity900,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
