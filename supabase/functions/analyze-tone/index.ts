// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// console.log("Hello from Functions!")

// Deno.serve(async (req) => {
//   const { name } = await req.json()
//   const data = {
//     message: `Hello ${name}!`,
//   }

//   return new Response(
//     JSON.stringify(data),
//     { headers: { "Content-Type": "application/json" } },
//   )
// })

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/analyze-tone' \
    --header 'Authorization: Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ4NjA0MDV9.CzYNXIirD-k-d9LfnqKJ5KDHeobnA8-M4aY9fNoYX8itUN46FH8-1FIIiv2pjdVHXLHplCWue7B8Wq3WhwGwbQ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { analyzeWithOpenAI } from "./lib/openai";
import { ToneCheckerV2Zod } from "./lib/zod.ts";
import { createClient } from "@supabase/supabase-js";

type Relationship = "business" | "personal";
type Situation = "neutral" | "sensitive" | "casual";

type ReqBody = {
  text?: string;
  device_id?: string;
  relationship?: Relationship;
  situation?: Situation;
};

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  business: "업무/비즈니스",
  personal: "개인/사적 관계",
};

const SITUATION_LABEL: Record<Situation, string> = {
  neutral: "일반/중립(안내·요청)",
  sensitive: "조심/민감(불만·거절·문제)",
  casual: "가벼움/캐주얼(편한 대화)",
};

// Supabase admin client (service role)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

// 공통 JSON 응답 헬퍼
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}


function isRelationship(x: unknown): x is Relationship {
  return x === "business" || x === "personal";
}

function isSituation(x: unknown): x is Situation {
  return x === "neutral" || x === "sensitive" || x === "casual";
}


Deno.serve(async (req) => {
  // 1. 입력 파싱
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "INVALID_JSON" });
  }

  const { text, device_id } = body;

  if (typeof text !== "string" || typeof device_id !== "string") {
    return json(400, { error: "INVALID_INPUT" });
  }

   // relationship/situation: 없으면 기본값
   const relationship: Relationship = isRelationship(body.relationship) ? body.relationship : "business";
   const situation: Situation = isSituation(body.situation) ? body.situation : "neutral";

  // 2. 길이 검증 (20~800)
  const trimmed = text.trim();
  const length = trimmed.length;
  if (length < 20) return json(400, { error: "TEXT_TOO_SHORT", min: 20 });
  if (length > 800) return json(400, { error: "TEXT_TOO_LONG", max: 800 });

  const accuracy_warning = length <= 50;

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
    }
  }

  if (!aiResult) {
    // ❗ 실패 시 usage 차감 없음
    return json(502, {
      error: "ANALYSIS_FAILED",
      retry_attempted: true,
      details: String((lastError as Error)?.message ?? lastError),
    });
  }

  // 5. 성공 시 usage 차감 (RPC)
  const { error: rpcError } = await supabaseAdmin.rpc(
    "use_analysis_once",
    { p_device_id: device_id },
  );

  if (rpcError) {
    return json(500, {
      error: "USAGE_DEDUCT_FAILED",
      details: rpcError.message,
    });
  }

  // 6. JSON 반환
  return json(200, {
    ...aiResult,
    accuracy_warning,
  });
});