import { supabase } from 'lib/supabase';
import type { AnalyzeRequestV2Dto, GenerateResponseDto, CorrectResponseDto } from 'lib/schema';
import { ENDPOINT } from 'constants/endpoint';
import { captureError } from 'lib/sentry';

/**
 * AI 톤 분석 요청 (v2)
 * mode에 따라 메시지 생성 또는 말투 교정
 */
export async function analyzeToneV2(
  request: AnalyzeRequestV2Dto
): Promise<GenerateResponseDto | CorrectResponseDto> {
  try {
    const { data, error } = await supabase.functions.invoke(ENDPOINT.ANALYZE_TONE, {
      body: {
        mode: request.mode,
        device_id: request.device_id,
        text: request.text,
        scenario: request.scenario,
        tone: request.tone,
        platform: request.platform,
      },
    });

    if (error) {
      captureError(error, {
        location: 'api/analyzeToneV2',
        tags: { feature: 'tone-analysis-v2' },
        extras: {
          mode: request.mode,
          deviceId: request.device_id,
          textLength: request.text.length,
        },
      });
      throw error;
    }

    return data;
  } catch (error) {
    captureError(error, {
      location: 'api/analyzeToneV2/catch',
      tags: { feature: 'tone-analysis-v2' },
    });
    throw new Error('Failed to analyze tone (v2)');
  }
}
