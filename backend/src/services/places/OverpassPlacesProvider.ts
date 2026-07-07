import { AppLanguage, CitySearchResult, Place } from '../../models/types';
import { NearbyPlacesQuery, PlacesProvider } from './PlacesProvider';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
// Nominatim silently 403s the common "dev@example.com" placeholder contact — use a real,
// project-identifying value here (see README) before relying on this in production.
const USER_AGENT = 'easy-travel-route-planner/1.0 (https://github.com/easy-travel/route-planner)';

// Single source of truth for both the Overpass filter regex and category-label lookup below —
// a node can carry an unrelated, unfiltered tag (e.g. historic=district on a leisure=park node),
// so the category picker must only trust values that are actually in these curated sets.
const TOURISM_VALUES = ['attraction', 'museum', 'artwork', 'gallery', 'viewpoint', 'zoo', 'theme_park', 'aquarium'];
const HISTORIC_VALUES = [
  'castle', 'monument', 'memorial', 'ruins', 'church', 'fort', 'fortress',
  'city_gate', 'tomb', 'archaeological_site', 'wayside_cross', 'palace', 'tower', 'manor', 'monastery',
];
const AMENITY_VALUES = ['restaurant', 'cafe', 'bar', 'theatre', 'cinema', 'place_of_worship', 'marketplace'];
const LEISURE_VALUES = ['park', 'garden', 'nature_reserve'];

const POI_TAGS = [
  `tourism~"^(${TOURISM_VALUES.join('|')})$"`,
  `historic~"^(${HISTORIC_VALUES.join('|')})$"`,
  `amenity~"^(${AMENITY_VALUES.join('|')})$"`,
  `leisure~"^(${LEISURE_VALUES.join('|')})$"`,
];

const CATEGORY_LABELS: Record<AppLanguage, Record<string, string>> = {
  ru: {
    attraction: 'Достопримечательность',
    museum: 'Музей',
    artwork: 'Арт-объект',
    gallery: 'Галерея',
    viewpoint: 'Смотровая площадка',
    zoo: 'Зоопарк',
    theme_park: 'Парк развлечений',
    aquarium: 'Аквариум',
    restaurant: 'Ресторан',
    cafe: 'Кафе',
    bar: 'Бар',
    theatre: 'Театр',
    cinema: 'Кинотеатр',
    place_of_worship: 'Культовое сооружение',
    marketplace: 'Рынок',
    park: 'Парк',
    garden: 'Сад',
    nature_reserve: 'Заповедник',
    castle: 'Замок',
    monument: 'Памятник',
    memorial: 'Мемориал',
    ruins: 'Руины',
    church: 'Церковь',
    fort: 'Крепость',
    fortress: 'Крепость',
    city_gate: 'Городские ворота',
    tomb: 'Гробница',
    archaeological_site: 'Археологический памятник',
    wayside_cross: 'Придорожный крест',
    palace: 'Дворец',
    tower: 'Башня',
    manor: 'Усадьба',
    monastery: 'Монастырь',
  },
  en: {
    attraction: 'Attraction',
    museum: 'Museum',
    artwork: 'Artwork',
    gallery: 'Gallery',
    viewpoint: 'Viewpoint',
    zoo: 'Zoo',
    theme_park: 'Theme park',
    aquarium: 'Aquarium',
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    bar: 'Bar',
    theatre: 'Theatre',
    cinema: 'Cinema',
    place_of_worship: 'Place of worship',
    marketplace: 'Marketplace',
    park: 'Park',
    garden: 'Garden',
    nature_reserve: 'Nature reserve',
    castle: 'Castle',
    monument: 'Monument',
    memorial: 'Memorial',
    ruins: 'Ruins',
    church: 'Church',
    fort: 'Fort',
    fortress: 'Fortress',
    city_gate: 'City gate',
    tomb: 'Tomb',
    archaeological_site: 'Archaeological site',
    wayside_cross: 'Wayside cross',
    palace: 'Palace',
    tower: 'Tower',
    manor: 'Manor',
    monastery: 'Monastery',
  },
};

function humanize(slug: string): string {
  return slug
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const TAG_PRIORITY: [key: 'tourism' | 'historic' | 'amenity' | 'leisure', allowed: string[]][] = [
  ['tourism', TOURISM_VALUES],
  ['historic', HISTORIC_VALUES],
  ['amenity', AMENITY_VALUES],
  ['leisure', LEISURE_VALUES],
];

function categoryFromTags(tags: Record<string, string>, lang: AppLanguage): string {
  for (const [key, allowed] of TAG_PRIORITY) {
    const value = tags[key];
    if (value && allowed.includes(value)) {
      return CATEGORY_LABELS[lang][value] ?? humanize(value);
    }
  }
  // The node matched one of our Overpass filters, but the winning tag's value fell outside the
  // curated set above (shouldn't normally happen) — fall back to whichever tag is present.
  const fallback = tags.tourism ?? tags.historic ?? tags.amenity ?? tags.leisure ?? 'place';
  return CATEGORY_LABELS[lang][fallback] ?? humanize(fallback);
}

/** OSM contributors tag translated names as name:<lang> alongside the default (usually local-language) `name`. */
function nameFromTags(tags: Record<string, string>, lang: AppLanguage): string | undefined {
  if (lang === 'ru') {
    // Prefer an actual translation; fall back to English before the raw (often local-script) name.
    return tags['name:ru'] ?? tags['name:en'] ?? tags.name;
  }
  return tags['name:en'] ?? tags.name;
}

function acceptLanguageFor(lang: AppLanguage): string {
  return lang === 'ru' ? 'ru,en' : 'en';
}

/** Escapes a user-provided string so Overpass's `~` regex match treats it as a literal substring. */
function escapeOverpassRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '\\"');
}

const REQUEST_TIMEOUT_MS = 35_000;
const OVERPASS_QUERY_TIMEOUT_S = 30;

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
  boundingbox?: [string, string, string, string];
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
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

    return results.map((result) => {
      const name =
        result.address?.city ??
        result.address?.town ??
        result.address?.village ??
        result.address?.municipality ??
        result.display_name.split(',')[0].trim();
      const country = result.address?.country;

      return {
        name,
        countryCode: result.address?.country_code?.toUpperCase(),
        displayName: country ? `${name}, ${country}` : name,
        coordinates: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
        boundingBox: result.boundingbox
          ? {
              south: parseFloat(result.boundingbox[0]),
              north: parseFloat(result.boundingbox[1]),
              west: parseFloat(result.boundingbox[2]),
              east: parseFloat(result.boundingbox[3]),
            }
          : undefined,
      };
    });
  }

  async getNearbyPlaces({ lat, lng, radius, lang, boundingBox, nameQuery }: NearbyPlacesQuery): Promise<Place[]> {
    const geoFilter = boundingBox
      ? `(${boundingBox.south},${boundingBox.west},${boundingBox.north},${boundingBox.east})`
      : `(around:${radius},${lat},${lng})`;
    const nameFilter = nameQuery ? `[name~"${escapeOverpassRegexLiteral(nameQuery)}",i]` : '';

    const filters = POI_TAGS.map((tag) => `node[${tag}]${nameFilter}${geoFilter};`).join('\n      ');
    const query = `
      [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];
      (
      ${filters}
      );
      out center 120;
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
        category: categoryFromTags(tags, lang),
        coordinates: coords,
        description: tags.description,
        source: 'overpass',
      });
    }
    return places;
  }
}
