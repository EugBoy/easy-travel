import { AppLanguage, CitySearchResult, Place } from '../../models/types';

export interface PlacesProvider {
  searchCities(query: string, lang: AppLanguage): Promise<CitySearchResult[]>;
  getNearbyPlaces(lat: number, lng: number, radius: number, lang: AppLanguage): Promise<Place[]>;
}
