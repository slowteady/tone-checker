import { z } from 'zod';

export const dailyUsageSchema = z.object({
  /**
   * UUID
   */
  id: z.string(),
  /**
   * 기기 ID
   */
  device_id: z.string(),
  /**
   * 날짜
   */
  date: z.string(),
  /**
   * 무료 제한
   */
  free_limit: z.number(),
  /**
   * 무료 사용 횟수
   */
  used_count: z.number(),
  /**
   * 보상형 광고 제한
   */
  rewarded_limit: z.number(),
  /**
   * 보상형 광고 사용 횟수
   */
  rewarded_count: z.number(),
  /**
   * 보상형 광고로 사용한 횟수
   */
  rewarded_used_count: z.number(),
  /**
   * 생성 시간
   */
  created_at: z.string(),
});
export type DailyUsageDto = z.infer<typeof dailyUsageSchema>;

export const deviceSchema = z.object({
  /**
   * UUID
   */
  id: z.string(),
  /**
   * 기기 ID
   */
  device_id: z.string(),
  /**
   * 생성 시간
   */
  created_at: z.string(),
  /**
   * 마지막 요청/접속 시각
   */
  last_seen_at: z.string(),
});
export type DeviceDto = z.infer<typeof deviceSchema>;

export const usageInfoSchema = z.object({
  /**
   * 무료 남은 횟수
   */
  remaining_free: z.number(),
  /**
   * 보상형 광고 남은 횟수
   */
  remaining_rewarded: z.number(),
  /**
   * 총 남은 횟수
   */
  remaining_total: z.number(),
  /**
   * 제한 여부
   */
  has_limit: z.boolean(),
});
export type UsageInfoDto = z.infer<typeof usageInfoSchema>;

export const rewardResponseSchema = z.object({
  /**
   * 충전 성공 여부
   */
  rewarded: z.boolean(),
  /**
   * 남은 충전 가능 횟수
   */
  reward_charge_remaining: z.number(),
});
export type RewardResponseDto = z.infer<typeof rewardResponseSchema>;

export const analyzeRequestSchema = z.object({
  /**
   * 분석할 텍스트
   */
  text: z.string().min(20).max(800),
  /**
   * 기기 ID
   */
  device_id: z.string(),
  /**
   * 관계
   */
  relationship: z.enum(['business', 'personal']),
  /**
   * 상황
   */
  situation: z.enum(['neutral', 'sensitive', 'casual']),
  /**
   * 플랫폼
   */
  platform: z.string(),
});
export type AnalyzeRequestDto = z.infer<typeof analyzeRequestSchema>;

export const analyzeResponseSchema = z.object({
  /**
   * 분석 성공 여부
   */
  ok: z.boolean(),
  /**
   * 분석 결과 또는 에러
   */
  data: z.unknown().optional(),
  /**
   * 에러 정보
   */
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type AnalyzeResponseDto = z.infer<typeof analyzeResponseSchema>;

export const categoryScoreItemSchema = z.object({
  score: z.number(),
  comment: z.string(),
  details: z.record(
    z.string(),
    z.object({
      score: z.number(),
      comment: z.string(),
    })
  ),
});
export type CategoryScoreItemDto = z.infer<typeof categoryScoreItemSchema>;

export const categoryScoresSchema = z.record(z.string(), categoryScoreItemSchema);
export type CategoryScoresDto = z.infer<typeof categoryScoresSchema>;
