import { AfterViewInit, Component, ElementRef, Injector, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { RouteApiService } from '../../core/services/route-api.service';
import { RouteStorageService } from '../../core/services/route-storage.service';
import { LanguageService } from '../../core/services/language.service';
import { patchLeafletDefaultIcon } from '../../shared/leaflet-icon-fix';
import { Place } from '../../shared/models/route.model';

const SELECTED_ICON = L.divIcon({
  className: 'place-marker place-marker-selected',
  html: '<span></span>',
  iconSize: [16, 16],
});

const DEFAULT_ICON = L.divIcon({
  className: 'place-marker',
  html: '<span></span>',
  iconSize: [12, 12],
});

@Component({
  selector: 'app-segment-view',
  imports: [RouterLink],
  template: `
    @if (route(); as r) {
      @if (segment(); as seg) {
        <div class="page page-wide">
          <a [routerLink]="['/routes']" class="text-muted back">← К списку маршрутов</a>

          <div class="screen-card">
            <div class="header">
              <div>
                <div class="eyebrow">Отрезок {{ segmentIndex() + 1 }} из {{ r.segments.length }}</div>
                <h2>{{ seg.city }}</h2>
                <div class="text-muted meta-row">
                  <span>{{ seg.arrivalDate }} — {{ seg.departureDate }}</span>
                  <span class="badge" [class.badge-accent]="seg.selectedPlaces.length > 0">
                    Выбрано: {{ seg.selectedPlaces.length }}
                  </span>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn" [disabled]="segmentIndex() === 0" (click)="goTo(segmentIndex() - 1)">← Назад</button>
                @if (isLastSegment()) {
                  <button class="btn btn-primary" [disabled]="!canFinish() || generating()" (click)="finish()">
                    {{ generating() ? 'Генерируем план…' : 'Сгенерировать план поездки' }}
                  </button>
                } @else {
                  <button class="btn btn-primary" (click)="goTo(segmentIndex() + 1)">Далее →</button>
                }
              </div>
            </div>

            <div class="layout">
              <div class="list-panel">
                <input
                  class="input search-input"
                  type="text"
                  [placeholder]="'Поиск мест в ' + seg.city + '…'"
                  [value]="searchText()"
                  (input)="searchText.set($any($event.target).value)"
                />

                <div class="pills">
                  <div class="pill" [class.active]="categoryFilter() === null" (click)="categoryFilter.set(null)">Все</div>
                  @for (category of categories(); track category) {
                    <div class="pill" [class.active]="categoryFilter() === category" (click)="categoryFilter.set(category)">
                      {{ category }}
                    </div>
                  }
                </div>

                <div class="places-scroll">
                  @if (loadingPlaces()) {
                    <p class="text-muted">Загружаем достопримечательности…</p>
                  } @else if (filteredPlaces().length === 0) {
                    <p class="text-muted">Ничего не найдено рядом с этим городом.</p>
                  } @else {
                    @for (place of filteredPlaces(); track place.id) {
                      <div class="place-row" [class.selected]="isSelected(place)" (click)="toggleSelect(place)">
                        <div class="place-dot"></div>
                        <div class="place-text">
                          <div class="place-name">{{ place.name }}</div>
                          <div class="text-muted place-category">{{ place.category }}</div>
                        </div>
                        <div class="place-check">{{ isSelected(place) ? '✓' : '' }}</div>
                      </div>
                    }
                  }
                </div>
              </div>

              <div class="map-panel">
                <div #mapContainer class="map"></div>
              </div>
            </div>
          </div>

          @if (!canFinish() && isLastSegment()) {
            <p class="text-muted hint">Выберите хотя бы одно место в каждом отрезке маршрута.</p>
          }
          @if (errorMessage()) {
            <div class="toast toast-error">{{ errorMessage() }}</div>
          }
        </div>
      }
    } @else {
      <div class="page"><p class="text-muted">Маршрут не найден.</p></div>
    }
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 16px; font-size: 14px; }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 26px 40px;
      border-bottom: 1px solid var(--color-border);
      gap: 16px;
    }
    h2 { margin: 10px 0 6px; font-size: 26px; font-weight: 600; }
    .meta-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .header-actions { display: flex; gap: 10px; flex-shrink: 0; }
    .layout { display: grid; grid-template-columns: 400px 1fr; }
    .list-panel {
      border-right: 1px solid var(--color-border);
      padding: 24px 24px 0;
      display: flex;
      flex-direction: column;
      height: 560px;
    }
    .search-input { margin-bottom: 14px; }
    .pills { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .places-scroll {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      flex: 1;
      padding-bottom: 24px;
    }
    .place-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
    }
    .place-row.selected {
      background: var(--color-accent-tint);
      border-color: var(--color-accent-border);
    }
    .place-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-border-dashed); flex-shrink: 0; }
    .place-row.selected .place-dot { background: var(--color-accent); }
    .place-text { flex: 1; min-width: 0; }
    .place-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .place-category { font-size: 12px; margin-top: 2px; }
    .place-check {
      width: 20px; height: 20px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
      color: transparent;
      border: 1.5px solid var(--color-border-soft);
    }
    .place-row.selected .place-check {
      color: var(--color-bg);
      background: var(--color-accent);
      border: none;
    }
    .map-panel { position: relative; height: 560px; }
    .map { height: 100%; width: 100%; }
    .hint { margin-top: 12px; font-size: 13px; }
  `],
})
export class SegmentViewComponent implements AfterViewInit {
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  private readonly route$ = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly storage = inject(RouteStorageService);
  private readonly api = inject(RouteApiService);
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);

  private readonly params = toSignal(this.route$.paramMap, { initialValue: this.route$.snapshot.paramMap });

  protected readonly routeId = computed(() => this.params()?.get('routeId') ?? '');
  protected readonly segmentIndex = computed(() => Number(this.params()?.get('segmentIndex') ?? 0));

  protected readonly route = computed(() => this.storage.getRoute(this.routeId()));
  protected readonly segment = computed(() => this.route()?.segments[this.segmentIndex()]);
  protected readonly isLastSegment = computed(() => {
    const r = this.route();
    return !!r && this.segmentIndex() === r.segments.length - 1;
  });
  protected readonly canFinish = computed(() => {
    const r = this.route();
    return !!r && r.segments.every((s) => s.selectedPlaces.length > 0);
  });

  private readonly placesCache = signal<Record<string, Place[]>>({});
  protected readonly loadingPlaces = signal(false);
  protected readonly generating = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly searchText = signal('');
  protected readonly categoryFilter = signal<string | null>(null);

  private readonly allPlacesForSegment = computed(() => {
    const seg = this.segment();
    return seg ? (this.placesCache()[`${seg.id}:${this.language.lang()}`] ?? []) : [];
  });

  protected readonly categories = computed(() =>
    Array.from(new Set(this.allPlacesForSegment().map((p) => p.category))).sort(),
  );

  protected readonly filteredPlaces = computed(() => {
    const text = this.searchText().trim().toLowerCase();
    const category = this.categoryFilter();
    return this.allPlacesForSegment().filter(
      (place) =>
        (!text || place.name.toLowerCase().includes(text)) && (!category || place.category === category),
    );
  });

  private map?: L.Map;
  private tileLayer?: L.TileLayer;
  private markers: L.Marker[] = [];

  constructor() {
    patchLeafletDefaultIcon();

    effect(() => {
      const seg = this.segment();
      const lang = this.language.lang();
      const cacheKey = seg ? `${seg.id}:${lang}` : undefined;
      if (!seg || !cacheKey || this.placesCache()[cacheKey]) return;
      this.loadingPlaces.set(true);
      this.api.getNearbyPlaces(seg.coordinates.lat, seg.coordinates.lng).subscribe({
        next: ({ places }) => {
          this.placesCache.update((cache) => ({ ...cache, [cacheKey]: places }));
          this.loadingPlaces.set(false);
        },
        error: () => {
          this.loadingPlaces.set(false);
          this.errorMessage.set('Не удалось загрузить достопримечательности. Попробуйте обновить страницу.');
        },
      });
    });
  }

  ngAfterViewInit(): void {
    if (!this.mapContainer) return;
    this.map = L.map(this.mapContainer.nativeElement);
    this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    effect(
      () => {
        const seg = this.segment();
        if (!seg || !this.map) return;
        this.map.setView([seg.coordinates.lat, seg.coordinates.lng], 13);
      },
      { injector: this.injector },
    );

    effect(
      () => {
        this.renderMarkers();
      },
      { injector: this.injector },
    );
  }

  private renderMarkers(): void {
    if (!this.map) return;
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];

    const selected = this.selectedIdSet();
    for (const place of this.filteredPlaces()) {
      const marker = L.marker([place.coordinates.lat, place.coordinates.lng], {
        icon: selected.has(place.id) ? SELECTED_ICON : DEFAULT_ICON,
      })
        .addTo(this.map)
        .bindTooltip(place.name)
        .on('click', () => this.toggleSelect(place));
      this.markers.push(marker);
    }
  }

  private selectedIdSet(): Set<string> {
    return new Set(this.segment()?.selectedPlaces.map((p) => p.id) ?? []);
  }

  protected isSelected(place: Place): boolean {
    return this.selectedIdSet().has(place.id);
  }

  protected toggleSelect(place: Place): void {
    const seg = this.segment();
    const r = this.route();
    if (!seg || !r) return;

    const alreadySelected = this.isSelected(place);
    this.storage.updateSegment(r.id, seg.id, (segment) => ({
      ...segment,
      selectedPlaces: alreadySelected
        ? segment.selectedPlaces.filter((p) => p.id !== place.id)
        : [...segment.selectedPlaces, place],
    }));

    if (r.status === 'draft') {
      this.storage.updateRoute(r.id, (route) => ({ ...route, status: 'places_selected' }));
    }
  }

  protected goTo(index: number): void {
    this.router.navigate(['/routes', this.routeId(), 'segments', index]);
  }

  protected finish(): void {
    const r = this.route();
    if (!r || !this.canFinish()) return;

    this.generating.set(true);
    this.errorMessage.set(null);
    this.api.generatePlan(r.segments).subscribe({
      next: (response) => {
        this.storage.updateRoute(r.id, (route) => ({
          ...route,
          status: 'plan_generated',
          segments: route.segments.map((segment) => {
            const result = response.segments.find((s) => s.segmentId === segment.id);
            return result ? { ...segment, dailyPlan: result.dailyPlan } : segment;
          }),
        }));
        this.generating.set(false);
        this.router.navigate(['/routes', r.id, 'plan']);
      },
      error: () => {
        this.generating.set(false);
        this.errorMessage.set('Не удалось сгенерировать план. Проверьте, что backend запущен, и попробуйте снова.');
      },
    });
  }
}
