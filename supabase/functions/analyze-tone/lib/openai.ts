import OpenAI from 'npm:openai@5';
import { SYSTEM_MESSAGE } from './system.ts';
import { TONE_CHECKER_V2_SCHEMA } from './jsonSchema.ts';

const apiKey = Deno.env.get('OPENAI_API_KEY');
if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

const client = new OpenAI({ apiKey });

type Relationship = 'business' | 'personal';
type Situation = 'neutral' | 'sensitive' | 'casual';

export type Context = {
  relationship: Relationship;
  relationshipLabel: string;
  situation: Situation;
  situationLabel: string;
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

export async function analyzeWithOpenAI(text: string, ctx: Context): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  const userContent =
    `관계: ${ctx.relationshipLabel} (${ctx.relationship})\n` +
    `상황: ${ctx.situationLabel} (${ctx.situation})\n` +
    `문장: ${text}`;

  try {
    const res = await client.responses.create(
      {
        model: 'gpt-4o-mini',
        max_output_tokens: 1000,
        input: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: userContent },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'tone_checker_v2',
            strict: true,
            schema: TONE_CHECKER_V2_SCHEMA,
          },
        },
      },
      { signal: controller.signal }
    );

    // ✅ 거부(refusal) 감지 → class 없이 태그 붙여 throw
    if (hasRefusal(res)) {
      throw tagRefusalError(new Error('MODEL_REFUSED'));
    }

    // status 방어 (있을 수도/없을 수도)
    const status = (res as { status?: string })?.status;
    if (status && status !== 'completed') {
      throw new Error(`OpenAI status not completed: ${status}`);
    }

    return extractParsedJson(res);
  } finally {
    clearTimeout(timeout);
  }
}
