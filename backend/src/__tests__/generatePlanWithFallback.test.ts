import { describe, expect, it } from 'vitest';
import { generatePlanWithFallback } from '../services/ai/generatePlanWithFallback';
import { AiPlannerService } from '../services/ai/AiPlannerService';
import { RouteSegmentInput } from '../models/types';

const segment: RouteSegmentInput = {
  id: 'seg-1',
  order: 0,
  city: 'Lisbon',
  coordinates: { lat: 38.72, lng: -9.14 },
  arrivalDate: '2026-08-01',
  departureDate: '2026-08-02',
  selectedPlaces: [],
};

describe('generatePlanWithFallback', () => {
  it('returns aiGenerated: true when the planner succeeds', async () => {
    const planner: AiPlannerService = {
      generatePlanForSegment: async () => [{ date: '2026-08-01', items: [] }],
    };
    const result = await generatePlanWithFallback(planner, segment);
    expect(result.aiGenerated).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('falls back with a warning when the planner throws', async () => {
    const planner: AiPlannerService = {
      generatePlanForSegment: async () => {
        throw new Error('timeout');
      },
    };
    const result = await generatePlanWithFallback(planner, segment);
    expect(result.aiGenerated).toBe(false);
    expect(result.warning).toContain('timeout');
    expect(result.dailyPlan.length).toBeGreaterThan(0);
  });

  it('falls back when no planner is configured', async () => {
    const result = await generatePlanWithFallback(undefined, segment);
    expect(result.aiGenerated).toBe(false);
    expect(result.warning).toBeDefined();
  });
});
