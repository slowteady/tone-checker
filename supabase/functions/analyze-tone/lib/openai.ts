import OpenAI from 'npm:openai@5';
import { SYSTEM_MESSAGE } from './system.ts';
import { TONE_CHECKER_V2_SCHEMA } from './jsonSchema.ts';
import { SYSTEM_GENERATE } from './systemGenerate.ts';
import { SYSTEM_CORRECT } from './systemCorrect.ts';
import { SCHEMA_GENERATE } from './jsonSchemaGenerate.ts';
import { SCHEMA_CORRECT } from './jsonSchemaCorrect.ts';

const apiKey = Deno.env.get('OPENAI_API_KEY');
if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

const client = new OpenAI({ apiKey });

// v1 타입 (기존 호환성 유지)
type Relationship = 'business' | 'personal';
type Situation = 'neutral' | 'sensitive' | 'casual';

export type Context = {
  relationship: Relationship;
  relationshipLabel: string;
  situation: Situation;
  situationLabel: string;
};

// v2 타입
type Scenario = 'to_child' | 'to_parent' | 'boss' | 'colleague' | 'client' | 'friend' | 'partner';
type Tone = 'soft' | 'firm' | 'formal' | 'casual';

export type ContextV2 = {
  scenario: Scenario;
  scenarioLabel: string;
  tone: Tone;
  toneLabel: string;
};

/**
 * index.ts에서 "거부"를 구분할 때 사용할 식별자
 * - class 없이 Error.cause로 태그를 남기는 방식
 */
export const OPENAI_REFUSAL_TAG = 'OPENAI_REFUSAL' as const;

function tagRefusalError(err: Error): Error {
  (err as { cause?: unknown }).cause = OPENAI_REFUSAL_TAG;
  return err;
}

function isRefusalError(err: unknown): boolean {
  return err instanceof Error && (err as { cause?: unknown }).cause === OPENAI_REFUSAL_TAG;
}

// ✅ export: index.ts에서 사용할 수 있도록 제공
export function isOpenAIRefusal(err: unknown): boolean {
  return isRefusalError(err);
}

function extractParsedJson(res: {
  output_parsed?: unknown;
  output_text?: string;
  output?: { content?: { text?: string }[] }[];
}): unknown {
  // 1) SDK가 제공하는 parsed 결과 우선
  if (res?.output_parsed != null) return res.output_parsed;

  // 2) output_text 파싱
  const t: unknown = res?.output_text;
  if (typeof t === 'string' && t.trim().length > 0) {
    try {
      return JSON.parse(t);
    } catch {
      // fallthrough
    }
  }

  // 3) 다양한 응답 형태 안전망
  try {
    const text =
      res?.output?.[0]?.content?.find?.((c: { text?: string }) => typeof c?.text === 'string')?.text ??
      res?.output?.find?.((o: { type?: string }) => o?.type === 'message')?.content?.[0]?.text;

    if (typeof text === 'string' && text.trim().length > 0) return JSON.parse(text);
  } catch {
    // ignore
  }

  throw new Error('OpenAI response missing parsed JSON');
}

function hasRefusal(res: { output?: { type?: string }[] }): boolean {
  const out = res?.output;
  if (!Array.isArray(out)) return false;
  return out.some((item: { type?: string }) => item?.type === 'refusal');
}

/**
 * OpenAI API 호출 공통 로직
 */
async function callOpenAI(params: {
  systemPrompt: string;
  userContent: string;
  schemaName: string;
  schema: unknown;
  maxTokens: number;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await client.responses.create(
      {
        model: 'gpt-4.1-mini',
        max_output_tokens: params.maxTokens,
        input: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userContent },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: params.schemaName,
            strict: true,
            schema: params.schema,
          },
        },
      },
      { signal: controller.signal }
    );

    if (hasRefusal(res)) {
      throw tagRefusalError(new Error('MODEL_REFUSED'));
    }

    const status = (res as { status?: string })?.status;
    const incomplete = (res as { incomplete_details?: string })?.incomplete_details;
    const usage = (res as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } })
      ?.usage;
    if (status && status !== 'completed') {
      throw new Error(`OpenAI status not completed: ${status}, incomplete: ${incomplete}, usage: ${usage}`);
    }

    return extractParsedJson(res);
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeWithOpenAI(text: string, ctx: Context): Promise<unknown> {
  const userContent =
    `관계: ${ctx.relationshipLabel} (${ctx.relationship})\n` +
    `상황: ${ctx.situationLabel} (${ctx.situation})\n` +
    `문장: ${text}`;

  return callOpenAI({
    systemPrompt: SYSTEM_MESSAGE,
    userContent,
    schemaName: 'tone_checker_v2',
    schema: TONE_CHECKER_V2_SCHEMA,
    maxTokens: 2500,
  });
}

/**
 * v2: 메시지 생성 모드
 */
export async function analyzeGenerate(text: string, ctx: ContextV2): Promise<unknown> {
  const userContent =
    `시나리오: ${ctx.scenarioLabel} (${ctx.scenario})\n` +
    `말투: ${ctx.toneLabel} (${ctx.tone})\n` +
    `상황: ${text}`;

  return callOpenAI({
    systemPrompt: SYSTEM_GENERATE,
    userContent,
    schemaName: 'message_generate',
    schema: SCHEMA_GENERATE,
    maxTokens: 1500,
  });
}

/**
 * v2: 말투 교정 모드
 */
export async function analyzeCorrect(text: string, ctx: ContextV2): Promise<unknown> {
  const userContent =
    `시나리오: ${ctx.scenarioLabel} (${ctx.scenario})\n` +
    `말투: ${ctx.toneLabel} (${ctx.tone})\n` +
    `문장: ${text}`;

  return callOpenAI({
    systemPrompt: SYSTEM_CORRECT,
    userContent,
    schemaName: 'tone_correct',
    schema: SCHEMA_CORRECT,
    maxTokens: 2500,
  });
}
