import { z } from "zod";

const score = z.number().int().min(0).max(100);
const short50 = z.string().min(1).max(50);

const detailItem = z.object({
  score,
  comment: short50,
});

const categoryBase = z.object({
  score,
  comment: short50,
  details: z.record(detailItem),
});

export const ToneCheckerV2Zod = z.object({
  overall_score: score,
  summary: short50,
  category_scores: z.object({
    emotion_attitude: categoryBase,
    politeness_respect: categoryBase,
    aggression_conflict: categoryBase,
    clarity_delivery: categoryBase,
    context_fit: categoryBase,
  }),
  signals: z
    .array(
      z.object({
        category: z.string(),
        sub_category: z.string(),
        level: z.enum(["low", "medium", "high"]),
        reason: z.string().min(1).max(30),
        evidence: z.string().min(1).max(30),
      }),
    )
    .max(3),
  suggestions: z
    .array(
      z.object({
        label: z.string().min(1).max(20),
        description: z.string().min(1).max(50),
        example: z.string().min(1).max(120),
      }),
    )
    .length(3),
  warnings: z.array(z.string().min(1).max(50)).max(3),
});

export type ToneCheckerV2Result = z.infer<typeof ToneCheckerV2Zod>;