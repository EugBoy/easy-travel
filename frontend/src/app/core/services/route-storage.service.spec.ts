import { TestBed } from '@angular/core/testing';
import { RouteStorageService } from './route-storage.service';

describe('RouteStorageService', () => {
  let service: RouteStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouteStorageService);
  });

  it('creates a route with a draft status and persists it to localStorage', () => {
    const route = service.createRoute('Trip', [
      {
        order: 0,
        city: 'Lisbon',
        coordinates: { lat: 38.7, lng: -9.1 },
        arrivalDate: '2026-08-01',
        departureDate: '2026-08-03',
      },
    ]);

    expect(route.status).toBe('draft');
    expect(service.getRoute(route.id)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('easy-travel.routes')!)).toHaveLength(1);
  });

  it('updates a segment selection without mutating other segments', () => {
    const route = service.createRoute('Trip', [
      { order: 0, city: 'Lisbon', coordinates: { lat: 38.7, lng: -9.1 }, arrivalDate: '2026-08-01', departureDate: '2026-08-02' },
      { order: 1, city: 'Porto', coordinates: { lat: 41.1, lng: -8.6 }, arrivalDate: '2026-08-02', departureDate: '2026-08-04' },
    ]);
    const [firstSegment, secondSegment] = route.segments;

    service.updateSegment(route.id, firstSegment.id, (segment) => ({
      ...segment,
      selectedPlaces: [{ id: 'p1', name: 'Castle', category: 'attraction', coordinates: { lat: 0, lng: 0 }, source: 'overpass' }],
    }));

    const updated = service.getRoute(route.id)!;
    expect(updated.segments[0].selectedPlaces).toHaveLength(1);
    expect(updated.segments[1].id).toBe(secondSegment.id);
    expect(updated.segments[1].selectedPlaces).toHaveLength(0);
  });

  it('deletes a route', () => {
    const route = service.createRoute('Trip', [
      { order: 0, city: 'Lisbon', coordinates: { lat: 38.7, lng: -9.1 }, arrivalDate: '2026-08-01', departureDate: '2026-08-02' },
    ]);
    service.deleteRoute(route.id);
    expect(service.getRoute(route.id)).toBeUndefined();
  });
});
