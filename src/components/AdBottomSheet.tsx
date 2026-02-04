import { Stack } from '@granite-js/react-native';
import { Asset, BottomSheet, Button, colors, Txt } from '@toss/tds-react-native';
import { StyleSheet, View } from 'react-native';

export interface AdBottomSheetProps {
  open: boolean;
  rewardChargeRemaining: number;
  onClose: () => void;
  onWatchAd: () => void;
  onExited: () => void;
  isLoading: boolean;
}

const LIMIT_COUNT = 5;

export const AdBottomSheet = ({
  open,
  rewardChargeRemaining,
  onClose,
  onWatchAd,
  onExited,
  isLoading,
}: AdBottomSheetProps) => {
  return (
    <BottomSheet.Root
      open={open}
      onClose={onClose}
      onExited={onExited}
      header={<BottomSheet.Header>광고 보고 1회 충전할까요?</BottomSheet.Header>}
      headerDescription={
        <BottomSheet.HeaderDescription>광고 시청 후 분석 횟수 1회가 추가돼요.</BottomSheet.HeaderDescription>
      }
      cta={
        <BottomSheet.CTA.Double
          leftButton={
            <Button display="block" style="weak" type="dark" onPress={onClose}>
              다음에 볼게요
            </Button>
          }
          rightButton={
            <Button display="block" onPress={onWatchAd} disabled={isLoading}>
              광고 시청하기
            </Button>
          }
        />
      }
      wrapperProps={{ contentContainerStyle: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 } }}
      unstable_disableDragging
    >
      <View style={[styles.chip, { marginBottom: 12 }]}>
        <Txt typography="st12" fontWeight="bold" color={colors.grey500}>
          {`오늘 충전 가능 횟수: ${rewardChargeRemaining} / ${LIMIT_COUNT}`}
        </Txt>
      </View>

      <View style={{ backgroundColor: colors.grey50, borderRadius: 16, padding: 16 }}>
        <Stack direction="horizontal" align="center" gutter={16}>
          <Asset.Icon
            name="icon-lightning-blue"
            frameShape={Asset.frameShape.SquareMedium}
            backgroundColor={colors.background}
            scale={0.6}
            style={{
              borderWidth: 1,
              borderColor: colors.grey100,
              borderRadius: 12,
            }}
          />
          <Stack direction="vertical" align="flex-start">
            <Txt typography="st12" fontWeight="bold" color={colors.grey500}>
              Reward
            </Txt>
            <Txt typography="st11" fontWeight="bold" color={colors.grey900}>
              +1회 분석권 즉시 지급
            </Txt>
          </Stack>
        </Stack>
      </View>
    </BottomSheet.Root>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.grey100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    alignSelf: 'baseline',
  },
});
