export interface Coordinates {
  lat: number;
  lng: number;
}

export type PlaceSource = 'overpass' | 'manual';

export interface Place {
  id: string;
  name: string;
  category: string;
  coordinates: Coordinates;
  description?: string;
  source: PlaceSource;
}

export interface PlanItem {
  placeId: string;
  order: number;
  suggestedArrivalTime?: string;
  suggestedDurationMinutes?: number;
  travelNoteToNext?: string;
}

export interface DailyPlan {
  date: string;
  items: PlanItem[];
}

export interface RouteSegment {
  id: string;
  order: number;
  city: string;
  countryCode?: string;
  coordinates: Coordinates;
  arrivalDate: string;
  departureDate: string;
  selectedPlaces: Place[];
  dailyPlan?: DailyPlan[];
}

export type RouteStatus = 'draft' | 'places_selected' | 'plan_generated';

export interface Route {
  id: string;
  title: string;
  segments: RouteSegment[];
  status: RouteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CitySearchResult {
  name: string;
  countryCode?: string;
  displayName: string;
  coordinates: Coordinates;
}
