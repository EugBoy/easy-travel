import { z } from 'zod';

export const coordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const boundingBoxSchema = z.object({
  south: z.number(),
  north: z.number(),
  west: z.number(),
  east: z.number(),
});

export const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  coordinates: coordinatesSchema,
  description: z.string().optional(),
  source: z.enum(['overpass', 'manual']),
});

export const routeSegmentInputSchema = z.object({
  id: z.string(),
  order: z.number(),
  city: z.string(),
  countryCode: z.string().optional(),
  coordinates: coordinatesSchema,
  boundingBox: boundingBoxSchema.optional(),
  arrivalDate: z.string(),
  departureDate: z.string(),
  selectedPlaces: z.array(placeSchema),
});

export const generatePlanRequestSchema = z.object({
  segments: z.array(routeSegmentInputSchema).min(1),
});

const languageSchema = z.enum(['ru', 'en']).default('en');

export const nearbyPlacesQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().positive().max(50000).default(5000),
  lang: languageSchema,
  south: z.coerce.number().optional(),
  north: z.coerce.number().optional(),
  west: z.coerce.number().optional(),
  east: z.coerce.number().optional(),
  query: z.string().min(1).optional(),
});

export const citySearchQuerySchema = z.object({
  query: z.string().min(1),
  lang: languageSchema,
});

export const dailyPlanSchemaForRoute = z.object({
  date: z.string(),
  items: z.array(
    z.object({
      placeId: z.string(),
      order: z.number(),
      suggestedArrivalTime: z.string().optional(),
      suggestedDurationMinutes: z.number().optional(),
      travelNoteToNext: z.string().optional(),
    }),
  ),
});

export const routeSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'places_selected', 'plan_generated']),
  createdAt: z.string(),
  updatedAt: z.string(),
  segments: z.array(
    routeSegmentInputSchema.extend({
      dailyPlan: z.array(dailyPlanSchemaForRoute).optional(),
    }),
  ),
});
