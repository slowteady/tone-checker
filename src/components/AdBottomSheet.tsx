import { Stack } from '@granite-js/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Asset, BottomSheet, Button, colors, Txt } from '@toss/tds-react-native';
import { rewardOnce } from 'api/usage';
import { ENDPOINT } from 'constants/endpoint';
import { useAd } from 'hooks/useAd';
import type { UsageInfoDto } from 'lib/schema';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export interface AdBottomSheetProps {
  deviceId: string;
  open: boolean;
  rewardChargeRemaining: number;
  onClose: () => void;
  onFailedToShow: () => void;
}

const LIMIT_COUNT = 5;
const AD_TIMEOUT_MS = 7_000;

export const AdBottomSheet = ({
  deviceId,
  open,
  rewardChargeRemaining,
  onClose,
  onFailedToShow,
}: AdBottomSheetProps) => {
  const qc = useQueryClient();
  const queryKey = useMemo(() => [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId] as const, [deviceId]);

  const adGroupId = useMemo(() => (__DEV__ ? import.meta.env.REWARD_AD_DEV_ID : import.meta.env.REWARD_AD_ID), []);

  const { actions: ad } = useAd({ adGroupId });

  const [isWatching, setIsWatching] = useState(false);
  const [rewardReady, setRewardReady] = useState(false); // ✅ userEarnedReward 받았는지
  const [canClaim, setCanClaim] = useState(false); // ✅ 광고가 종료(dismissed/failed)되었는지

  const shownRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const resetAdFlowState = () => {
    shownRef.current = false;
    clearTimer();
    setIsWatching(false);
    setRewardReady(false);
    setCanClaim(false);
  };

  const watchAd = useCallback(async () => {
    if (isWatching) return;

    resetAdFlowState();
    setIsWatching(true);

    // 1) load
    const loadRes = await ad.loadAd();
    if (loadRes !== 'loaded') {
      ad.cleanup();
      setIsWatching(false);
      onFailedToShow();
      return;
    }

    // 2) show까지 7초 제한 (show 이벤트가 오면 타이머 해제)
    timeoutRef.current = setTimeout(() => {
      if (shownRef.current) return;
      // show가 7초 안에 안 뜬 케이스 → 광고 없다고 간주
      ad.cleanup();
      setIsWatching(false);
      onFailedToShow();
    }, AD_TIMEOUT_MS);

    ad.showAd({
      onShow: () => {
        shownRef.current = true;
        clearTimer();
      },
      onReward: () => {
        setRewardReady(true);
      },
      onDismissed: () => {
        clearTimer();
        ad.cleanup();
        setIsWatching(false);
        // 광고가 종료됐으니 이제 "리워드 받기" 가능(보상 받았을 때만)
        setCanClaim(true);
      },
    });
  }, [ad, isWatching, onFailedToShow]);

  const claimReward = useCallback(async () => {
    // 보상 없으면 누를 필요 없음 (UI에서도 disabled)
    if (!rewardReady) return;

    // ✅ optimistic: 즉시 +1 충전 선반영
    const previous = qc.getQueryData<UsageInfoDto>(queryKey);

    qc.setQueryData<UsageInfoDto>(queryKey, (prev) => {
      if (!prev) return prev;

      const nextTotal = prev.remaining_total + 1;
      const nextRewarded = prev.remaining_rewarded + 1;
      const nextChargeRemaining = Math.max(prev.reward_charge_remaining - 1, 0);

      return {
        ...prev,
        remaining_total: nextTotal,
        remaining_rewarded: nextRewarded,
        reward_charge_remaining: nextChargeRemaining,
        has_limit: nextTotal <= 0 ? true : false,
      };
    });

    try {
      await rewardOnce(deviceId);
      // 서버 진실값으로 최종 동기화
      await qc.invalidateQueries({ queryKey });
      onClose();
    } catch {
      // 실패 시 롤백
      if (previous) qc.setQueryData(queryKey, previous);
      onFailedToShow(); // “충전에 실패했습니다. 다시 시도해주세요.” 같은 UX로 재사용 가능
    } finally {
      resetAdFlowState();
    }
  }, [deviceId, qc, queryKey, rewardReady, onClose, onFailedToShow]);

  const handleClose = useCallback(() => {
    clearTimer();
    ad.cleanup();
    resetAdFlowState();
    onClose();
  }, [ad, onClose]);

  const rightButton = useMemo(() => {
    // 1) 광고 시청 전/중: "광고 시청하기"
    if (!canClaim) {
      return (
        <Button display="block" onPress={watchAd} disabled={isWatching || rewardChargeRemaining <= 0}>
          {isWatching ? '광고 준비 중...' : '광고 시청하기'}
        </Button>
      );
    }

    // 2) 광고 종료 후: "리워드 받기"
    return (
      <Button display="block" onPress={claimReward} disabled={!rewardReady}>
        리워드 받기
      </Button>
    );
  }, [canClaim, watchAd, isWatching, rewardChargeRemaining, claimReward, rewardReady]);

  return (
    <>
      <BottomSheet.Root
        open={open}
        onClose={handleClose}
        header={<BottomSheet.Header>광고 보고 1회 충전할까요?</BottomSheet.Header>}
        headerDescription={
          <BottomSheet.HeaderDescription>광고 시청 후 분석 횟수 1회가 추가돼요.</BottomSheet.HeaderDescription>
        }
        cta={
          <BottomSheet.CTA.Double
            leftButton={
              <Button display="block" style="weak" type="dark" onPress={handleClose}>
                다음에 볼게요
              </Button>
            }
            rightButton={rightButton}
          />
        }
        wrapperProps={{ contentContainerStyle: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 } }}
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

              {canClaim && !rewardReady && (
                <Txt typography="st12" fontWeight="bold" color={colors.red500} style={{ marginTop: 6 }}>
                  보상을 받지 못했어요. 광고를 끝까지 시청해 주세요.
                </Txt>
              )}
            </Stack>
          </Stack>
        </View>
      </BottomSheet.Root>
    </>
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
