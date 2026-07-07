import { AppLanguage, CitySearchResult, Place } from '../../models/types';
import { PlacesProvider } from './PlacesProvider';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
// Nominatim silently 403s the common "dev@example.com" placeholder contact — use a real,
// project-identifying value here (see README) before relying on this in production.
const USER_AGENT = 'easy-travel-route-planner/1.0 (https://github.com/easy-travel/route-planner)';

const POI_TAGS = [
  'tourism~"^(attraction|museum|artwork|gallery|viewpoint|zoo|theme_park)$"',
  'historic',
  'amenity~"^(restaurant|cafe|bar|theatre|cinema)$"',
  'leisure~"^(park|garden)$"',
];

function categoryFromTags(tags: Record<string, string>): string {
  return (
    tags.tourism ??
    tags.historic ??
    tags.amenity ??
    tags.leisure ??
    'place'
  );
}

/** OSM contributors tag translated names as name:<lang> alongside the default (usually local-language) `name`. */
function nameFromTags(tags: Record<string, string>, lang: AppLanguage): string | undefined {
  if (lang === 'ru') {
    return tags['name:ru'] ?? tags.name ?? tags['name:en'];
  }
  return tags['name:en'] ?? tags.name;
}

function acceptLanguageFor(lang: AppLanguage): string {
  return lang === 'ru' ? 'ru,en' : 'en';
}

const REQUEST_TIMEOUT_MS = 20_000;

/** Public Overpass/Nominatim instances can hang under load — fail fast instead of blocking the request forever. */
async function fetchWithTimeout(input: string | URL, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The public Overpass instance throttles heavily (429) or times out (504) under load — one retry smooths over transient hiccups. */
async function fetchWithRetry(input: string | URL, init: RequestInit): Promise<Response> {
  const response = await fetchWithTimeout(input, init);
  if (response.status === 429 || response.status === 504) {
    await sleep(1500);
    return fetchWithTimeout(input, init);
  }
  return response;
}

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country_code?: string;
  };
}

export class OverpassPlacesProvider implements PlacesProvider {
  async searchCities(query: string, lang: AppLanguage): Promise<CitySearchResult[]> {
    if (!query.trim()) return [];

    const url = new URL(`${NOMINATIM_URL}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '8');
    url.searchParams.set('featureType', 'city');
    url.searchParams.set('accept-language', acceptLanguageFor(lang));

    const response = await fetchWithTimeout(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Nominatim request failed: ${response.status}${response.status === 429 ? ' (rate limited, try again shortly)' : ''}`);
    }
    const results = (await response.json()) as NominatimResult[];

    return results.map((result) => ({
      name:
        result.address?.city ??
        result.address?.town ??
        result.address?.village ??
        result.address?.municipality ??
        result.display_name.split(',')[0].trim(),
      countryCode: result.address?.country_code?.toUpperCase(),
      displayName: result.display_name,
      coordinates: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
    }));
  }

  async getNearbyPlaces(lat: number, lng: number, radius: number, lang: AppLanguage): Promise<Place[]> {
    const filters = POI_TAGS.map((tag) => `node[${tag}](around:${radius},${lat},${lng});`).join(
      '\n      ',
    );
    const query = `
      [out:json][timeout:25];
      (
      ${filters}
      );
      out center 60;
    `;

    const response = await fetchWithRetry(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) {
      const hint = response.status === 429 || response.status === 504
        ? ' (Overpass overloaded, try again shortly)'
        : '';
      throw new Error(`Overpass request failed: ${response.status}${hint}`);
    }
    const data = (await response.json()) as OverpassResponse;

    const places: Place[] = [];
    for (const element of data.elements) {
      const tags = element.tags ?? {};
      const name = nameFromTags(tags, lang);
      if (!name) continue;
      const coords = element.lat != null && element.lon != null
        ? { lat: element.lat, lng: element.lon }
        : element.center
          ? { lat: element.center.lat, lng: element.center.lon }
          : undefined;
      if (!coords) continue;

      places.push({
        id: `${element.type}/${element.id}`,
        name,
        category: categoryFromTags(tags),
        coordinates: coords,
        description: tags.description,
        source: 'overpass',
      });
    }
    return places;
  }
}
