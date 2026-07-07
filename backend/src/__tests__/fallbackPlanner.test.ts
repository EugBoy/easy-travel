import { describe, expect, it } from 'vitest';
import { buildFallbackDailyPlan } from '../services/ai/fallbackPlanner';
import { RouteSegmentInput } from '../models/types';

function makeSegment(overrides: Partial<RouteSegmentInput> = {}): RouteSegmentInput {
  return {
    id: 'seg-1',
    order: 0,
    city: 'Lisbon',
    coordinates: { lat: 38.72, lng: -9.14 },
    arrivalDate: '2026-08-01',
    departureDate: '2026-08-03',
    selectedPlaces: [],
    ...overrides,
  };
}

describe('buildFallbackDailyPlan', () => {
  it('creates one entry per day between arrival and departure', () => {
    const plan = buildFallbackDailyPlan(makeSegment());
    expect(plan).toHaveLength(2);
    expect(plan[0].date).toBe('2026-08-01');
    expect(plan[1].date).toBe('2026-08-02');
  });

  it('creates at least one day even if arrival equals departure', () => {
    const plan = buildFallbackDailyPlan(
      makeSegment({ arrivalDate: '2026-08-01', departureDate: '2026-08-01' }),
    );
    expect(plan).toHaveLength(1);
  });

  it('distributes all selected places across the available days', () => {
    const places = ['a', 'b', 'c', 'd'].map((id) => ({
      id,
      name: id,
      category: 'museum',
      coordinates: { lat: 0, lng: 0 },
      source: 'overpass' as const,
    }));
    const plan = buildFallbackDailyPlan(
      makeSegment({ arrivalDate: '2026-08-01', departureDate: '2026-08-03', selectedPlaces: places }),
    );
    const totalItems = plan.reduce((sum, day) => sum + day.items.length, 0);
    expect(totalItems).toBe(4);
  });

  it('returns empty item lists when no places were selected', () => {
    const plan = buildFallbackDailyPlan(makeSegment());
    for (const day of plan) {
      expect(day.items).toEqual([]);
    }
  });
});
