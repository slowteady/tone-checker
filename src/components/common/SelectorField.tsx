import { Asset, colors, Txt } from '@toss/tds-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

export interface SelectorFieldProps {
  title: string;
  selectedLabel?: string;
  onPress: () => void;
}

export function SelectorField({ title, selectedLabel, onPress }: SelectorFieldProps) {
  return (
    <View style={styles.selectorColumn}>
      <Txt typography="t6" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 8 }}>
        {title}
      </Txt>
      <Pressable onPress={onPress} style={styles.selectorBox}>
        <Txt typography="t6" color={colors.grey900} numberOfLines={1} style={{ flex: 1 }}>
          {selectedLabel}
        </Txt>
        <Asset.Icon name="icon-chip-arrow-down-mono" frameShape={{ width: 22, height: 22 }} color={colors.grey600} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorColumn: {
    flex: 1,
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.grey200,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
});
