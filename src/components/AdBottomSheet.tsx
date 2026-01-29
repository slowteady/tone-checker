import { Stack } from '@granite-js/react-native';
import { Asset, BottomSheet, Button, colors, Txt } from '@toss/tds-react-native';
import { View } from 'react-native';

export interface AdBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

export const AdBottomSheet = ({ open, onClose }: AdBottomSheetProps) => {
  const handleWatchAd = () => {
    console.log('광고 시청');
  };

  return (
    <BottomSheet.Root
      open={open}
      onClose={onClose}
      header={<BottomSheet.Header>광고 보고 1회 더 사용할까요?</BottomSheet.Header>}
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
            <Button display="block" onPress={handleWatchAd}>
              광고 시청하기
            </Button>
          }
        />
      }
      wrapperProps={{ contentContainerStyle: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 } }}
    >
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
