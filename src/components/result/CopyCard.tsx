import { colors } from '@toss/tds-colors';
import { Asset, Button, Tooltip, Txt } from '@toss/tds-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useClipboardCopy } from 'hooks/useClipboardCopy';

export interface CopyCardProps {
  label: string;
  description?: string;
  example: string;
}

export const CopyCard = ({ label, description, example }: CopyCardProps) => {
  const { copy } = useClipboardCopy();

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCopiedTooltip = useCallback(() => {
    setTooltipOpen(true);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setTooltipOpen(false), 1500);
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await copy(example);
    if (ok) {
      openCopiedTooltip();
      return;
    }
  }, [copy, example, openCopiedTooltip]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.chip, { marginBottom: 12 }]}>
        <Txt typography="st12" fontWeight="bold" color={colors.blue600}>
          {label}
        </Txt>
      </View>
      <Txt typography="st11" fontWeight="semibold" color={colors.grey600} style={{ marginBottom: 16 }}>
        {description}
      </Txt>
      <View style={[styles.card, { marginBottom: 20 }]}>
        <Txt typography="t6" fontWeight="medium" color={colors.grey900}>
          {example}
        </Txt>
      </View>

      <Tooltip
        open={tooltipOpen}
        message="복사되었어요"
        placement="top"
        size="small"
        onClose={() => setTooltipOpen(false)}
        onPressOutside={() => setTooltipOpen(false)}
      >
        <Button
          display="block"
          size="medium"
          pointerEvents="auto"
          onPress={handleCopy}
          type="light"
          style="fill"
          color={colors.blue600}
          leftAccessory={
            <Asset.Icon
              name="icon-document"
              frameShape={Asset.frameShape.CircleSmall}
              accessibilityLabel={'복사하기'}
              scale={0.6}
              style={null}
            />
          }
        >
          복사하기
        </Button>
      </Tooltip>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.grey50,
    borderRadius: 24,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: colors.blue50,
    alignSelf: 'baseline',
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.grey100,
  },
});
