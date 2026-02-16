import { z } from 'zod';

const messageItem = z.object({
  label: z.string().min(1).max(20),
  text: z.string().min(1).max(1200),
});

export const GenerateResultZod = z.object({
  messages: z.array(messageItem).length(3),
});

export type GenerateResult = z.infer<typeof GenerateResultZod>;
