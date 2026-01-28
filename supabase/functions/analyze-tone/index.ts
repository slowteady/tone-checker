import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { ToneCheckerV2Zod } from './lib/zod.ts';
import { createClient } from '@supabase/supabase-js';
import { reportError } from './lib/reportError.ts';
import { isOpenAIRefusal } from './lib/openai.ts';

type Relationship = 'business' | 'personal';
type Situation = 'neutral' | 'sensitive' | 'casual';

type ReqBody = {
  text?: string;
  device_id?: string;
  relationship?: Relationship;
  situation?: Situation;
};

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  business: '업무/비즈니스',
  personal: '개인/사적 관계',
};

const SITUATION_LABEL: Record<Situation, string> = {
  neutral: '일반/중립(안내·요청)',
  sensitive: '조심/민감(불만·거절·문제)',
  casual: '가벼움/캐주얼(편한 대화)',
};

type ApiErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_JSON'
  | 'INVALID_INPUT'
  | 'TEXT_TOO_SHORT'
  | 'TEXT_TOO_LONG'
  | 'CONFIG_MISSING'
  | 'OPENAI_IMPORT_FAILED'
  | 'ANALYSIS_REFUSED'
  | 'ANALYSIS_FAILED'
  | 'USAGE_LIMIT_EXCEEDED';

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: ApiErrorCode; message: string } };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function ok<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { ok: true, data };
  return json(status, body);
}

function fail(status: number, code: ApiErrorCode, message: string) {
  const body: ApiResponse<never> = { ok: false, error: { code, message } };
  return json(status, body);
}

function isRelationship(x: unknown): x is Relationship {
  return x === 'business' || x === 'personal';
}

function isSituation(x: unknown): x is Situation {
  return x === 'neutral' || x === 'sensitive' || x === 'casual';
}

// OpenAI는 필요할 때만 로드 (로컬 단계별 테스트/부팅 안정성 목적)
type OpenAIContext = {
  relationship: Relationship;
  relationshipLabel: string;
  situation: Situation;
  situationLabel: string;
};

Deno.serve(async (req) => {
  // 1. 입력 파싱
  if (req.method !== 'POST') {
    return fail(405, 'METHOD_NOT_ALLOWED', '허용되지 않은 요청 방식이에요.');
  }

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'INVALID_JSON', '요청 형식이 올바르지 않아요. 다시 시도해 주세요.');
  }

  const { text, device_id } = body;
  if (typeof text !== 'string' || typeof device_id !== 'string') {
    return fail(400, 'INVALID_INPUT', '입력값이 올바르지 않아요. 다시 확인해 주세요.');
  }

  // relationship/situation: 없으면 기본값
  const relationship: Relationship = isRelationship(body.relationship) ? body.relationship : 'business';
  const situation: Situation = isSituation(body.situation) ? body.situation : 'neutral';

  // 2. 길이 검증 (20~800)
  const trimmed = text.trim();
  const length = trimmed.length;
  if (length < 20) return fail(400, 'TEXT_TOO_SHORT', '문장을 20자 이상 입력해 주세요.');
  if (length > 800) return fail(400, 'TEXT_TOO_LONG', '문장을 800자 이하로 줄여 주세요.');

  const accuracy_warning = length <= 50;

  // Supabase admin client (service role)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    reportError('CONFIG_MISSING', undefined, {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return fail(500, 'CONFIG_MISSING', '서버 설정 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let analyzeWithOpenAI: ((text: string, ctx: OpenAIContext) => Promise<unknown>) | null = null;
  try {
    ({ analyzeWithOpenAI } = await import('./lib/openai.ts'));
  } catch (err) {
    reportError('OPENAI_IMPORT_FAILED', err);
    return fail(500, 'OPENAI_IMPORT_FAILED', '분석 설정이 준비되지 않았어요. 잠시 후 다시 시도해 주세요.');
  }

  // 3. OpenAI 호출 (최대 1회 재시도)
  let aiResult: unknown = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await analyzeWithOpenAI(trimmed, {
        relationship,
        relationshipLabel: RELATIONSHIP_LABEL[relationship],
        situation,
        situationLabel: SITUATION_LABEL[situation],
      });

      // 4. zod 검증
      const parsed = ToneCheckerV2Zod.safeParse(raw);
      if (!parsed.success) {
        lastError = parsed.error;
        continue;
      }

      aiResult = parsed.data;
      break;
    } catch (err) {
      lastError = err;

      // ✅ 거부(refusal)는 재시도해도 같은 결과일 가능성이 높아 즉시 종료
      if (isOpenAIRefusal(err)) {
        reportError('ANALYSIS_REFUSED', err, { device_id, relationship, situation });
        return fail(400, 'ANALYSIS_REFUSED', '민감한 내용은 분석할 수 없어요. 문장을 바꿔서 다시 시도해 주세요.');
      }
    }
  }

  if (!aiResult) {
    // ❗ 실패 시 usage 차감 없음
    reportError('ANALYSIS_FAILED', lastError, { retry_attempted: true, device_id, relationship, situation });
    return fail(502, 'ANALYSIS_FAILED', '분석에 실패했어요. 잠시 후 다시 시도해 주세요.');
  }

  // 5. 성공 시 usage 차감 (RPC)
  const { data, error } = await supabaseAdmin.rpc('use_analysis_once', { p_device_id: device_id });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row?.success) {
    return fail(403, 'USAGE_LIMIT_EXCEEDED', '오늘 사용 가능 횟수를 모두 사용했어요.');
  }

  // 6. JSON 반환
  return ok({
    ...(aiResult as Record<string, unknown>),
    accuracy_warning,
    usage: {
      remaining_free: row.remaining_free,
      remaining_rewarded: row.remaining_rewarded,
      used_type: row.used_type,
    },
  });
});
