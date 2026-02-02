import { ENDPOINT } from 'constants/endpoint';
import { UsageInfoDto, RewardResponseDto } from 'lib/schema';
import { captureError } from 'lib/sentry';
import { supabase } from 'lib/supabase';

/**
 * 디바이스 ID로 남은 사용 횟수 조회
 */
export async function getRemainingUsage(deviceId: string): Promise<UsageInfoDto> {
  try {
    const { data, error } = await supabase.rpc(ENDPOINT.RPC_GET_TODAY_STATUS, {
      p_device_id: deviceId,
    });

    if (error) {
      captureError(error, {
        location: 'api/getRemainingUsage',
        tags: { feature: 'usage' },
        extras: { deviceId },
      });
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      remaining_free: row.free_remaining, // 무료 남은 횟수
      remaining_rewarded: row.reward_use_remaining, // 보상형 광고 남은 횟수
      remaining_total: row.total_remaining, // 총 남은 횟수(무료 + 충전된 보상)
      reward_charge_remaining: row.reward_charge_remaining, // 보상형 광고 충전 남은 횟수
      has_limit: row.total_remaining <= 0, // 제한 여부
    };
  } catch (error) {
    captureError(error, {
      location: 'api/getRemainingUsage/catch',
      tags: { feature: 'usage' },
    });
    throw new Error('Failed to fetch usage info');
  }
}

/**
 * 광고 시청 후 보상 횟수 충전
 * @param deviceId 기기 ID
 * @returns 충전 성공 여부 및 남은 충전 가능 횟수
 */
export async function rewardOnce(deviceId: string): Promise<RewardResponseDto> {
  try {
    const { data, error } = await supabase.rpc(ENDPOINT.RPC_REWARD_ONCE, {
      p_device_id: deviceId,
    });

    if (error) {
      captureError(error, {
        location: 'api/rewardOnce',
        tags: { feature: 'usage' },
        extras: { deviceId },
      });
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      rewarded: row.rewarded,
      reward_charge_remaining: row.reward_charge_remaining,
    };
  } catch (error) {
    captureError(error, {
      location: 'api/rewardOnce/catch',
      tags: { feature: 'usage' },
    });
    throw new Error('Failed to reward usage');
  }
}
