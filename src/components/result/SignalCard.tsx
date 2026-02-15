import { Flex } from '@granite-js/react-native';
import { colors } from '@toss/tds-colors';
import { Asset, Txt } from '@toss/tds-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

export interface SignalCardProps {
  level: string;
  reason: string;
  evidence: string;
}

export const SignalCard = ({ level, reason, evidence }: SignalCardProps) => {
  const iconName = useMemo(() => {
    if (level === 'high') return 'icon-warning-circle-red-fill';
    if (level === 'medium') return 'icon-warning-circle';
    if (level === 'low') return 'icon-info-circle-line-mono';
    return 'icon-info-circle-line-mono';
  }, [level]);

  return (
    <View style={styles.container}>
      <Flex direction="row" align="center" style={{ gap: 16, marginBottom: 12 }}>
        <Asset.Icon name={iconName} frameShape={Asset.frameShape.CleanH24} />
        <Txt typography="t5" fontWeight="bold" color={colors.grey900}>
          {reason}
        </Txt>
      </Flex>

      <View style={styles.evidenceWrap}>
        <Txt typography="st11" fontWeight="semibold" color={colors.grey500}>
          &quot;{evidence}&quot;
        </Txt>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.grey100,
  },
  evidenceWrap: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.grey50,
  },
});
