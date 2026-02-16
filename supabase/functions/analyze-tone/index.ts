import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { ToneCheckerV2Zod } from './lib/zod.ts';
import { GenerateResultZod } from './lib/zodGenerate.ts';
import { CorrectResultZod } from './lib/zodCorrect.ts';
import { createClient } from '@supabase/supabase-js';
import { reportError } from './lib/reportError.ts';
import { isOpenAIRefusal } from './lib/openai.ts';

// v1 타입 (하위 호환)
type Relationship = 'business' | 'personal';
type Situation = 'neutral' | 'sensitive' | 'casual';

// v2 타입
type Mode = 'generate' | 'correct';
type Scenario = 'to_child' | 'to_parent' | 'boss' | 'colleague' | 'client' | 'friend' | 'partner';
type Tone = 'soft' | 'firm' | 'formal' | 'casual';

type ReqBody = {
  text?: string;
  device_id?: string;
  relationship?: Relationship;
  situation?: Situation;
  platform?: string;
  // v2 필드
  mode?: Mode;
  scenario?: Scenario;
  tone?: Tone;
};

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  business: '비즈니스',
  personal: '개인',
};

const SITUATION_LABEL: Record<Situation, string> = {
  neutral: '일반',
  sensitive: '조심',
  casual: '편안',
};

// v2 label
export const SCENARIO_LABEL: Record<Scenario, string> = {
  to_child: '자녀',
  to_parent: '부모님',
  boss: '상사',
  colleague: '동료',
  client: '고객',
  friend: '친구',
  partner: '연인',
};

export const TONE_LABEL: Record<Tone, string> = {
  soft: '부드럽게',
  firm: '단호하게',
  formal: '격식있게',
  casual: '캐주얼하게',
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

// v2 타입 가드 함수
export function isMode(x: unknown): x is Mode {
  return x === 'generate' || x === 'correct';
}

export function isScenario(x: unknown): x is Scenario {
  return (
    x === 'to_child' ||
    x === 'to_parent' ||
    x === 'boss' ||
    x === 'colleague' ||
    x === 'client' ||
    x === 'friend' ||
    x === 'partner'
  );
}

export function isTone(x: unknown): x is Tone {
  return x === 'soft' || x === 'firm' || x === 'formal' || x === 'casual';
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

  const { text, device_id, mode } = body;
  if (typeof text !== 'string' || typeof device_id !== 'string') {
    return fail(400, 'INVALID_INPUT', '입력값이 올바르지 않아요. 다시 확인해 주세요.');
  }

  // v2 모드 검증
  if (mode !== undefined) {
    // mode가 있으면 v2로 간주
    if (!isMode(mode)) {
      return fail(400, 'INVALID_INPUT', 'mode 값이 올바르지 않아요. (generate 또는 correct)');
    }

    // v2에서는 scenario와 tone이 필수
    if (!isScenario(body.scenario)) {
      return fail(400, 'INVALID_INPUT', 'scenario 값이 올바르지 않아요.');
    }
    if (!isTone(body.tone)) {
      return fail(400, 'INVALID_INPUT', 'tone 값이 올바르지 않아요.');
    }
  }

  // v1 하위 호환: relationship/situation (없으면 기본값)
  const relationship: Relationship = isRelationship(body.relationship) ? body.relationship : 'business';
  const situation: Situation = isSituation(body.situation) ? body.situation : 'neutral';

  // 2. 길이 검증 (모드별 분기)
  const trimmed = text.trim();
  const length = trimmed.length;

  // v2 generate 모드: 10~800자
  if (mode === 'generate') {
    if (length < 10) return fail(400, 'TEXT_TOO_SHORT', '상황 설명을 10자 이상 입력해 주세요.');
    if (length > 800) return fail(400, 'TEXT_TOO_LONG', '상황 설명을 800자 이하로 줄여 주세요.');
  } else {
    // v1, v2 correct 모드: 20~800자
    if (length < 20) return fail(400, 'TEXT_TOO_SHORT', '문장을 20자 이상 입력해 주세요.');
    if (length > 800) return fail(400, 'TEXT_TOO_LONG', '문장을 800자 이하로 줄여 주세요.');
  }

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

  // OpenAI 함수 동적 import
  let analyzeWithOpenAI: ((text: string, ctx: OpenAIContext) => Promise<unknown>) | null = null;
  let analyzeGenerate: ((text: string, ctx: any) => Promise<unknown>) | null = null;
  let analyzeCorrect: ((text: string, ctx: any) => Promise<unknown>) | null = null;

  try {
    const openai = await import('./lib/openai.ts');
    analyzeWithOpenAI = openai.analyzeWithOpenAI;
    analyzeGenerate = openai.analyzeGenerate;
    analyzeCorrect = openai.analyzeCorrect;
  } catch (err) {
    reportError('OPENAI_IMPORT_FAILED', err);
    return fail(500, 'OPENAI_IMPORT_FAILED', '분석 설정이 준비되지 않았어요. 잠시 후 다시 시도해 주세요.');
  }

  // 3. OpenAI 호출 (최대 1회 재시도) - 모드별 분기
  let aiResult: unknown = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      let raw: unknown;

      if (mode === 'generate') {
        // v2 생성 모드
        if (!analyzeGenerate) throw new Error('analyzeGenerate not loaded');
        raw = await analyzeGenerate(trimmed, {
          scenario: body.scenario!,
          scenarioLabel: SCENARIO_LABEL[body.scenario!],
          tone: body.tone!,
          toneLabel: TONE_LABEL[body.tone!],
        });

        // Zod 검증
        const parsed = GenerateResultZod.safeParse(raw);
        if (!parsed.success) {
          lastError = parsed.error;
          continue;
        }
        aiResult = parsed.data;
      } else if (mode === 'correct') {
        // v2 교정 모드
        if (!analyzeCorrect) throw new Error('analyzeCorrect not loaded');
        raw = await analyzeCorrect(trimmed, {
          scenario: body.scenario!,
          scenarioLabel: SCENARIO_LABEL[body.scenario!],
          tone: body.tone!,
          toneLabel: TONE_LABEL[body.tone!],
        });

        // Zod 검증
        const parsed = CorrectResultZod.safeParse(raw);
        if (!parsed.success) {
          lastError = parsed.error;
          continue;
        }
        aiResult = parsed.data;
      } else {
        // v1 호환 모드
        if (!analyzeWithOpenAI) throw new Error('analyzeWithOpenAI not loaded');
        raw = await analyzeWithOpenAI(trimmed, {
          relationship,
          relationshipLabel: RELATIONSHIP_LABEL[relationship],
          situation,
          situationLabel: SITUATION_LABEL[situation],
        });

        // Zod 검증
        const parsed = ToneCheckerV2Zod.safeParse(raw);
        if (!parsed.success) {
          lastError = parsed.error;
          continue;
        }
        aiResult = parsed.data;
      }

      break;
    } catch (err) {
      lastError = err;

      // ✅ 거부(refusal)는 재시도해도 같은 결과일 가능성이 높아 즉시 종료
      if (isOpenAIRefusal(err)) {
        const context = mode
          ? { device_id, mode, scenario: body.scenario, tone: body.tone }
          : { device_id, relationship, situation };
        reportError('ANALYSIS_REFUSED', err, context);
        return fail(400, 'ANALYSIS_REFUSED', '민감한 내용은 분석할 수 없어요. 문장을 바꿔서 다시 시도해 주세요.');
      }
    }
  }

  if (!aiResult) {
    // ❗ 실패 시 usage 차감 없음
    const context = mode
      ? { retry_attempted: true, device_id, mode, scenario: body.scenario, tone: body.tone }
      : { retry_attempted: true, device_id, relationship, situation };
    reportError('ANALYSIS_FAILED', lastError, context);
    return fail(502, 'ANALYSIS_FAILED', '분석에 실패했어요. 잠시 후 다시 시도해 주세요.');
  }

  // 5. 성공 시 usage 차감 (RPC)
  const { data, error } = await supabaseAdmin.rpc('use_analysis_once', { p_device_id: device_id });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row?.allowed) {
    return fail(403, 'USAGE_LIMIT_EXCEEDED', '오늘 사용 가능 횟수를 모두 사용했어요.');
  }

  // 6. JSON 반환
  return ok({
    ...(aiResult as Record<string, unknown>),
    accuracy_warning,
    usage: {
      remaining_free: row.remaining_free,
      remaining_rewarded: row.remaining_rewarded,
      remaining_total: row.remaining_total,
      rewarded_limit: row.rewarded_limit,
      used_from: row.used_from,
    },
  });
});
