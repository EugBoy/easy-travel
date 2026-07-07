import { z } from 'zod';

export const planItemSchema = z.object({
  placeId: z.string(),
  order: z.number().int().nonnegative(),
  suggestedArrivalTime: z.string().optional(),
  suggestedDurationMinutes: z.number().positive().optional(),
  travelNoteToNext: z.string().optional(),
});

export const dailyPlanSchema = z.object({
  date: z.string(),
  items: z.array(planItemSchema),
});

export const llmPlanResponseSchema = z.object({
  dailyPlan: z.array(dailyPlanSchema),
});

export type LlmPlanResponse = z.infer<typeof llmPlanResponseSchema>;
