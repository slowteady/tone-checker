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
   * 보상형 광고 제한
   */
  rewarded_limit: z.number(),
  /**
   * 총 남은 횟수
   */
  remaining_total: z.number(),
  /**
   * 보상형 광고 충전 남은 횟수
   */
  reward_charge_remaining: z.number(),
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
  text: z.string().min(20).max(500),
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

export const analyzeRequestV2Schema = z.object({
  /**
   * 모드 (생성/교정)
   */
  mode: z.enum(['generate', 'correct']),
  /**
   * 분석할 텍스트
   */
  text: z.string().min(10).max(500),
  /**
   * 기기 ID
   */
  device_id: z.string(),
  /**
   * 시나리오 (관계)
   */
  scenario: z.enum(['to_child', 'to_parent', 'boss', 'colleague', 'client', 'friend', 'partner']),
  /**
   * 말투 (톤)
   */
  tone: z.enum(['soft', 'firm', 'formal', 'casual']),
  /**
   * 플랫폼
   */
  platform: z.string(),
});
export type AnalyzeRequestV2Dto = z.infer<typeof analyzeRequestV2Schema>;

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

export const usageResultSchema = z.object({
  /**
   * 무료 남은 횟수
   */
  remaining_free: z.number(),
  /**
   * 보상형 남은 횟수
   */
  remaining_rewarded: z.number(),
  /**
   * 총 남은 횟수
   */
  remaining_total: z.number(),
  /**
   * 사용된 횟수 출처
   */
  used_from: z.enum(['free_used', 'rewarded_used']),
  /**
   * 보상형 광고 제한
   */
  rewarded_limit: z.number(),
});
export type UsageResultDto = z.infer<typeof usageResultSchema>;

export const messageSchema = z.object({
  label: z.string(),
  text: z.string(),
});
export type MessageDto = z.infer<typeof messageSchema>;

export const generateResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    messages: z.array(messageSchema),
    usage: usageResultSchema,
  }),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type GenerateResponseDto = z.infer<typeof generateResponseSchema>;

export const suggestionSchema = z.object({
  label: z.string(),
  description: z.string(),
  example: z.string(),
});
export type SuggestionDto = z.infer<typeof suggestionSchema>;

export const signalSchema = z.object({
  category: z.string(),
  sub_category: z.string(),
  level: z.string(),
  reason: z.string(),
  evidence: z.string(),
});
export type SignalDto = z.infer<typeof signalSchema>;

export const correctionSchema = z.object({
  label: z.string(),
  description: z.string(),
  text: z.string(),
});
export type CorrectionDto = z.infer<typeof correctionSchema>;

export const correctResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    diagnosis: z.string(),
    corrections: z.array(correctionSchema),
    overall_score: z.number(),
    summary: z.string(),
    category_scores: categoryScoresSchema,
    signals: z.array(signalSchema),
    warnings: z.array(z.string()),
    usage: usageResultSchema,
  }),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type CorrectResponseDto = z.infer<typeof correctResponseSchema>;

export const analyzeResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    overall_score: z.number(),
    summary: z.string(),
    category_scores: categoryScoresSchema,
    signals: z.array(signalSchema),
    suggestions: z.array(suggestionSchema),
    warnings: z.array(z.string()),
    accuracy_warning: z.boolean(),
    usage: usageResultSchema,
  }),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type AnalyzeResponseDto = z.infer<typeof analyzeResponseSchema>;

/**
 * 타입 가드: v2 generate 모드 응답 확인
 */
export function isGenerateResponse(
  response: AnalyzeResponseDto | GenerateResponseDto | CorrectResponseDto | null
): response is GenerateResponseDto {
  return response !== null && 'data' in response && 'messages' in response.data;
}

/**
 * 타입 가드: v2 correct 모드 응답 확인
 */
export function isCorrectResponse(
  response: AnalyzeResponseDto | GenerateResponseDto | CorrectResponseDto | null
): response is CorrectResponseDto {
  return response !== null && 'data' in response && 'diagnosis' in response.data;
}

/**
 * 타입 가드: v1 응답 확인
 */
export function isAnalyzeResponse(
  response: AnalyzeResponseDto | GenerateResponseDto | CorrectResponseDto | null
): response is AnalyzeResponseDto {
  return response !== null && 'data' in response && 'suggestions' in response.data;
}
