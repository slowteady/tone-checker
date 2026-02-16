import { z } from 'zod';

const correctionItem = z.object({
  label: z.string().min(1).max(20),
  description: z.string().min(1).max(50),
  text: z.string().min(1).max(1200),
});

export const CorrectResultZod = z.object({
  diagnosis: z.string().min(1).max(50),
  corrections: z.array(correctionItem).length(3),
  overall_score: z.number(),
  summary: z.string(),
  category_scores: z.any(), // v1 구조 유지
  signals: z.array(z.any()), // v1 구조 유지
  warnings: z.array(z.string()),
});

export type CorrectResult = z.infer<typeof CorrectResultZod>;
