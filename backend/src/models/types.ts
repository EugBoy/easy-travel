export type AppLanguage = 'ru' | 'en';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
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

export interface CitySearchResult {
  name: string;
  countryCode?: string;
  displayName: string;
  coordinates: Coordinates;
  boundingBox?: BoundingBox;
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

export interface RouteSegmentInput {
  id: string;
  order: number;
  city: string;
  countryCode?: string;
  coordinates: Coordinates;
  boundingBox?: BoundingBox;
  arrivalDate: string;
  departureDate: string;
  selectedPlaces: Place[];
}

export interface GeneratePlanRequest {
  segments: RouteSegmentInput[];
}

export interface GeneratePlanResponseSegment {
  segmentId: string;
  dailyPlan: DailyPlan[];
  aiGenerated: boolean;
}

export interface GeneratePlanResponse {
  segments: GeneratePlanResponseSegment[];
}

export type RouteStatus = 'draft' | 'places_selected' | 'plan_generated';

export interface RouteSegment {
  id: string;
  order: number;
  city: string;
  countryCode?: string;
  coordinates: Coordinates;
  boundingBox?: BoundingBox;
  arrivalDate: string;
  departureDate: string;
  selectedPlaces: Place[];
  dailyPlan?: DailyPlan[];
}

export interface Route {
  id: string;
  title: string;
  segments: RouteSegment[];
  status: RouteStatus;
  createdAt: string;
  updatedAt: string;
}
