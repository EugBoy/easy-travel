import { Injectable, signal } from '@angular/core';
import { Route, RouteSegment } from '../../shared/models/route.model';

const STORAGE_KEY = 'easy-travel.routes';

@Injectable({ providedIn: 'root' })
export class RouteStorageService {
  private readonly routesSignal = signal<Route[]>(this.readFromStorage());
  readonly routes = this.routesSignal.asReadonly();

  private readFromStorage(): Route[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Route[]) : [];
    } catch {
      return [];
    }
  }

  private persist(routes: Route[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    this.routesSignal.set(routes);
  }

  getRoute(routeId: string): Route | undefined {
    return this.routesSignal().find((route) => route.id === routeId);
  }

  createRoute(title: string, segments: Omit<RouteSegment, 'id' | 'selectedPlaces'>[]): Route {
    const now = new Date().toISOString();
    const route: Route = {
      id: crypto.randomUUID(),
      title,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      segments: segments.map((segment) => ({
        ...segment,
        id: crypto.randomUUID(),
        selectedPlaces: [],
      })),
    };
    this.persist([...this.routesSignal(), route]);
    return route;
  }

  deleteRoute(routeId: string): void {
    this.persist(this.routesSignal().filter((route) => route.id !== routeId));
  }

  updateRoute(routeId: string, updater: (route: Route) => Route): void {
    this.persist(
      this.routesSignal().map((route) =>
        route.id === routeId ? { ...updater(route), updatedAt: new Date().toISOString() } : route,
      ),
    );
  }

  updateSegment(routeId: string, segmentId: string, updater: (segment: RouteSegment) => RouteSegment): void {
    this.updateRoute(routeId, (route) => ({
      ...route,
      segments: route.segments.map((segment) =>
        segment.id === segmentId ? updater(segment) : segment,
      ),
    }));
  }
}
