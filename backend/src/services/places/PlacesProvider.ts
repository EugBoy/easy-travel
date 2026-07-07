import { AppLanguage, BoundingBox, CitySearchResult, Place } from '../../models/types';

export interface NearbyPlacesQuery {
  lat: number;
  lng: number;
  radius: number;
  lang: AppLanguage;
  boundingBox?: BoundingBox;
  nameQuery?: string;
}

export interface PlacesProvider {
  searchCities(query: string, lang: AppLanguage): Promise<CitySearchResult[]>;
  getNearbyPlaces(query: NearbyPlacesQuery): Promise<Place[]>;
}
