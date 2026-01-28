import { z } from 'zod';

const score = z.number().int().min(0).max(100);
const short50 = z.string().min(1).max(50);

const detailItem = z.object({
  score,
  comment: short50,
});

// 헬퍼 함수: 카테고리 생성
const createCategory = <T extends z.ZodRawShape>(detailsShape: T) =>
  z.object({
    score,
    comment: short50,
    details: z.object(detailsShape).strict(),
  });

export const ToneCheckerV2Zod = z.object({
  overall_score: score,
  summary: short50,
  category_scores: z.object({
    emotion_attitude: createCategory({
      warmth_empathy: detailItem,
      emotional_stability: detailItem,
    }),
    politeness_respect: createCategory({
      politeness: detailItem,
      softness: detailItem,
    }),
    aggression_conflict: createCategory({
      non_aggressive: detailItem,
      conflict_mitigation: detailItem,
    }),
    clarity_delivery: createCategory({
      clarity: detailItem,
      actionability: detailItem,
    }),
    context_fit: createCategory({
      formality_fit: detailItem,
      low_misinterpretation_risk: detailItem,
    }),
  }),
  signals: z
    .array(
      z.object({
        category: z.enum([
          'emotion_attitude',
          'politeness_respect',
          'aggression_conflict',
          'clarity_delivery',
          'context_fit',
        ]),
        sub_category: z.enum([
          'warmth_empathy',
          'emotional_stability',
          'politeness',
          'softness',
          'non_aggressive',
          'conflict_mitigation',
          'clarity',
          'actionability',
          'formality_fit',
          'low_misinterpretation_risk',
        ]),
        level: z.enum(['low', 'medium', 'high']),
        reason: z.string().min(1).max(30),
        evidence: z.string().min(1).max(30),
      })
    )
    .max(3),
  suggestions: z
    .array(
      z.object({
        label: z.string().min(1).max(20),
        description: z.string().min(1).max(50),
        example: z.string().min(1).max(120),
      })
    )
    .length(3),
  warnings: z.array(z.string().min(1).max(50)).max(3),
});

export type ToneCheckerV2Result = z.infer<typeof ToneCheckerV2Zod>;
