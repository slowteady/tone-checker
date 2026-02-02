import { Stack } from '@granite-js/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Asset, BottomSheet, Button, colors, Txt } from '@toss/tds-react-native';
import { rewardOnce } from 'api/usage';
import { ENDPOINT } from 'constants/endpoint';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useAdStore } from 'stores/ad';

export interface AdBottomSheetProps {
  deviceId: string;
  open: boolean;
  rewardChargeRemaining: number;
  onClose: () => void;
  onFailedToShow: () => void;
}

const LIMIT_COUNT = 5;

export const AdBottomSheet = ({
  deviceId,
  open,
  rewardChargeRemaining,
  onClose,
  onFailedToShow,
}: AdBottomSheetProps) => {
  const adLoadStatus = useAdStore((s) => s.adLoadStatus);
  const qc = useQueryClient();

  const showAd = useAdStore((s) => s.showAd);

  const watchAd = useCallback(() => {
    if (adLoadStatus === 'failed') {
      onFailedToShow();
      onClose();
      return;
    }

    showAd({
      onUserEarnedReward: async () => {
        try {
          await rewardOnce(deviceId);
          await qc.invalidateQueries({ queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] });
          await qc.refetchQueries({ queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId], exact: true });
          onClose();
        } catch {
          qc.invalidateQueries({ queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] });
          onClose();
        }
      },
      onDismissed: () => {
        qc.invalidateQueries({ queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] });
        onClose();
      },
    });
  }, []);

  return (
    <>
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
              <Button display="block" onPress={watchAd}>
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
    </>
  );
};
