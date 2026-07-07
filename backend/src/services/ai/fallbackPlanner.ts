import { DailyPlan, RouteSegmentInput } from '../../models/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function countDays(arrivalDate: string, departureDate: string): number {
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  const diff = Math.round((departure.getTime() - arrival.getTime()) / MS_PER_DAY);
  return Math.max(1, diff);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Evenly splits selected places across the segment's days, in their existing order. */
export function buildFallbackDailyPlan(segment: RouteSegmentInput): DailyPlan[] {
  const dayCount = countDays(segment.arrivalDate, segment.departureDate);
  const places = segment.selectedPlaces;
  const plans: DailyPlan[] = Array.from({ length: dayCount }, (_, i) => ({
    date: addDays(segment.arrivalDate, i),
    items: [],
  }));

  if (places.length === 0) {
    return plans;
  }

  places.forEach((place, index) => {
    const dayIndex = Math.floor((index * dayCount) / places.length);
    const dayItems = plans[dayIndex].items;
    dayItems.push({
      placeId: place.id,
      order: dayItems.length,
    });
  });

  return plans;
}
