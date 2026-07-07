import { Router } from 'express';
import { PlacesProvider } from '../services/places/PlacesProvider';
import { citySearchQuerySchema, nearbyPlacesQuerySchema } from '../validation/requestSchemas';

export function createPlacesRouter(placesProvider: PlacesProvider): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const parsed = nearbyPlacesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid query parameters', issues: parsed.error.issues });
      return;
    }
    try {
      const { lat, lng, radius, lang, south, north, west, east, query } = parsed.data;
      const boundingBox = south != null && north != null && west != null && east != null
        ? { south, north, west, east }
        : undefined;
      const places = await placesProvider.getNearbyPlaces({ lat, lng, radius, lang, boundingBox, nameQuery: query });
      res.json({ places });
    } catch (error) {
      res.status(502).json({ message: (error as Error).message });
    }
  });

  router.get('/search', async (req, res) => {
    const parsed = citySearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid query parameters', issues: parsed.error.issues });
      return;
    }
    try {
      const cities = await placesProvider.searchCities(parsed.data.query, parsed.data.lang);
      res.json({ cities });
    } catch (error) {
      res.status(502).json({ message: (error as Error).message });
    }
  });

  return router;
}
