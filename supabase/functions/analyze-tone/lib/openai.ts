import OpenAI from "npm:openai@5";
import { SYSTEM_MESSAGE } from "./system.ts";
import { TONE_CHECKER_V2_SCHEMA } from "./jsonSchema.ts";

const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

const client = new OpenAI({ apiKey });

type Context = {
  relationship: "business" | "personal";
  relationshipLabel: string;
  situation: "neutral" | "sensitive" | "casual";
  situationLabel: string;
};

export async function analyzeWithOpenAI(text: string, ctx: Context): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  const userContent =
  `관계: ${ctx.relationshipLabel} (${ctx.relationship})\n` +
  `상황: ${ctx.situationLabel} (${ctx.situation})\n` +
  `문장: ${text}`;

  try {
    const res = await client.responses.create(
      {
        model: "gpt-4o-mini",
        max_output_tokens: 700,
        input: [
          { role: "system", content: SYSTEM_MESSAGE },
          { role: "user", content: userContent },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "tone_checker_v2",
            strict: true,
            schema: TONE_CHECKER_V2_SCHEMA,
          },
        },
      },
      { signal: controller.signal },
    );

    // structured outputs: output_parsed에 파싱 결과가 들어옴
    return res.output_parsed;
  } finally {
    clearTimeout(timeout);
  }
}