import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';
import { BoundingBox, CitySearchResult, DailyPlan, Place, Route, RouteSegment } from '../../shared/models/route.model';
import { LanguageService } from './language.service';

export interface GeneratePlanSegmentResult {
  segmentId: string;
  dailyPlan: DailyPlan[];
  aiGenerated: boolean;
}

export interface GeneratePlanResponse {
  segments: GeneratePlanSegmentResult[];
  warnings?: string[];
}

export interface NearbyPlacesRequest {
  lat: number;
  lng: number;
  boundingBox?: BoundingBox;
  /** Substring to match against place names, in addition to the geo filter. */
  query?: string;
}

@Injectable({ providedIn: 'root' })
export class RouteApiService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  searchCities(query: string): Observable<{ cities: CitySearchResult[] }> {
    return this.http.get<{ cities: CitySearchResult[] }>(`${API_BASE_URL}/places/search`, {
      params: { query, lang: this.language.lang() },
    });
  }

  getNearbyPlaces({ lat, lng, boundingBox, query }: NearbyPlacesRequest): Observable<{ places: Place[] }> {
    const params: Record<string, string | number> = { lat, lng, lang: this.language.lang() };
    if (boundingBox) {
      params['south'] = boundingBox.south;
      params['north'] = boundingBox.north;
      params['west'] = boundingBox.west;
      params['east'] = boundingBox.east;
    }
    if (query) {
      params['query'] = query;
    }
    return this.http.get<{ places: Place[] }>(`${API_BASE_URL}/places`, { params });
  }

  generatePlan(segments: RouteSegment[]): Observable<GeneratePlanResponse> {
    return this.http.post<GeneratePlanResponse>(`${API_BASE_URL}/ai/generate-plan`, { segments });
  }

  exportPdf(route: Route): Observable<Blob> {
    return this.http.post(`${API_BASE_URL}/export/pdf`, route, { responseType: 'blob' });
  }
}
