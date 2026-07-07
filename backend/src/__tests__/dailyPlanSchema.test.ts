import { describe, expect, it } from 'vitest';
import { llmPlanResponseSchema } from '../validation/dailyPlanSchema';

describe('llmPlanResponseSchema', () => {
  it('accepts a well-formed LLM response', () => {
    const result = llmPlanResponseSchema.safeParse({
      dailyPlan: [
        {
          date: '2026-08-01',
          items: [
            { placeId: 'node/1', order: 0, suggestedArrivalTime: '09:00', suggestedDurationMinutes: 60 },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a response missing required fields', () => {
    const result = llmPlanResponseSchema.safeParse({
      dailyPlan: [{ date: '2026-08-01', items: [{ order: 0 }] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a response that is not an object with dailyPlan', () => {
    const result = llmPlanResponseSchema.safeParse({ plan: [] });
    expect(result.success).toBe(false);
  });
});
