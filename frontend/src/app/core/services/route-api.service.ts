import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';
import { CitySearchResult, DailyPlan, Place, Route, RouteSegment } from '../../shared/models/route.model';
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

@Injectable({ providedIn: 'root' })
export class RouteApiService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  searchCities(query: string): Observable<{ cities: CitySearchResult[] }> {
    return this.http.get<{ cities: CitySearchResult[] }>(`${API_BASE_URL}/places/search`, {
      params: { query, lang: this.language.lang() },
    });
  }

  getNearbyPlaces(lat: number, lng: number, radius = 1500): Observable<{ places: Place[] }> {
    return this.http.get<{ places: Place[] }>(`${API_BASE_URL}/places`, {
      params: { lat, lng, radius, lang: this.language.lang() },
    });
  }

  generatePlan(segments: RouteSegment[]): Observable<GeneratePlanResponse> {
    return this.http.post<GeneratePlanResponse>(`${API_BASE_URL}/ai/generate-plan`, { segments });
  }

  exportPdf(route: Route): Observable<Blob> {
    return this.http.post(`${API_BASE_URL}/export/pdf`, route, { responseType: 'blob' });
  }
}
