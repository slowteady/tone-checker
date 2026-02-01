import { supabase } from 'lib/supabase';
import type { AnalyzeRequestDto, AnalyzeResponseDto } from 'lib/schema';
import { ENDPOINT } from 'constants/endpoint';
import { captureError } from 'lib/sentry';

/**
 * AI 톤 분석 요청
 * Edge Function (analyze-tone)을 호출하여 텍스트 분석
 */
export async function analyzeTone(request: AnalyzeRequestDto): Promise<AnalyzeResponseDto> {
  try {
    const { data, error } = await supabase.functions.invoke(ENDPOINT.ANALYZE_TONE, {
      body: {
        device_id: request.device_id,
        text: request.text,
        relationship: request.relationship,
        situation: request.situation,
        platform: request.platform,
      },
    });

    if (error) {
      captureError(error, {
        location: 'api/analyzeTone',
        tags: { feature: 'tone-analysis' },
        extras: {
          deviceId: request.device_id,
          textLength: request.text.length,
        },
      });
      throw error;
    }

    return data;
  } catch (error) {
    captureError(error, {
      location: 'api/analyzeTone/catch',
      tags: { feature: 'tone-analysis' },
    });
    throw new Error('Failed to analyze tone');
  }
}
