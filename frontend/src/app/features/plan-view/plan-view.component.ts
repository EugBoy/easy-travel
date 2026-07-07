import { AfterViewInit, Component, ElementRef, Injector, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { RouteApiService } from '../../core/services/route-api.service';
import { RouteStorageService } from '../../core/services/route-storage.service';
import { patchLeafletDefaultIcon } from '../../shared/leaflet-icon-fix';
import { Place, PlanItem } from '../../shared/models/route.model';

@Component({
  selector: 'app-plan-view',
  imports: [RouterLink],
  template: `
    @if (route(); as r) {
      <div class="page">
        <header class="header">
          <a routerLink="/routes" class="text-muted back">← К списку маршрутов</a>
          <div class="title-row">
            <h1>{{ r.title }}</h1>
            <button class="btn btn-primary" (click)="downloadPdf()" [disabled]="exporting()">
              {{ exporting() ? 'Экспортируем…' : 'Скачать PDF-отчёт' }}
            </button>
          </div>
        </header>

        <div class="segment-tabs">
          @for (segment of r.segments; track segment.id; let i = $index) {
            <button
              class="tab"
              [class.active]="i === activeSegmentIndex()"
              (click)="selectSegment(i)"
            >
              {{ segment.city }}
            </button>
          }
        </div>

        @if (activeSegment(); as seg) {
          <p class="text-muted dates">{{ seg.arrivalDate }} — {{ seg.departureDate }}</p>

          <div class="day-tabs">
            @for (day of seg.dailyPlan; track day.date; let i = $index) {
              <button class="tab day-tab" [class.active]="i === activeDayIndex()" (click)="activeDayIndex.set(i)">
                День {{ i + 1 }}
              </button>
            }
          </div>

          @if (activeDay(); as day) {
            <div class="layout">
              <div class="card list-panel">
                <h3 class="day-date">{{ day.date }}</h3>
                <ol class="items">
                  @for (item of day.items; track item.placeId) {
                    <li>
                      <div class="item-main">
                        <span class="item-name">{{ placeName(item.placeId) }}</span>
                        @if (item.suggestedArrivalTime) {
                          <span class="badge">{{ item.suggestedArrivalTime }}</span>
                        }
                      </div>
                      @if (item.suggestedDurationMinutes) {
                        <p class="text-muted item-detail">~{{ item.suggestedDurationMinutes }} мин на месте</p>
                      }
                      @if (item.travelNoteToNext) {
                        <p class="text-muted item-detail">→ {{ item.travelNoteToNext }}</p>
                      }
                    </li>
                  }
                </ol>
              </div>
              <div #mapContainer class="map"></div>
            </div>
          }
        }

        @if (message(); as m) {
          <div class="toast" [class.toast-error]="m.error">{{ m.text }}</div>
        }
      </div>
    } @else {
      <div class="page"><p class="text-muted">Маршрут не найден.</p></div>
    }
  `,
  styles: [`
    .header { margin-bottom: 16px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 14px; }
    .title-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .segment-tabs, .day-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; }
    .tab {
      height: 34px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-bg);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    .tab.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
    .day-tab { height: 30px; padding: 0 12px; }
    .dates { margin-bottom: 16px; }
    .layout { display: grid; grid-template-columns: 360px 1fr; gap: 16px; }
    .list-panel { max-height: 480px; overflow-y: auto; }
    .day-date { margin-bottom: 12px; }
    .items { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 14px; }
    .item-main { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .item-name { font-weight: 500; font-size: 14px; }
    .item-detail { font-size: 12px; margin-top: 2px; }
    .map { height: 480px; border-radius: var(--radius); border: 1px solid var(--color-border); }
  `],
})
export class PlanViewComponent implements AfterViewInit {
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  private readonly route$ = inject(ActivatedRoute);
  private readonly storage = inject(RouteStorageService);
  private readonly api = inject(RouteApiService);
  private readonly injector = inject(Injector);

  private readonly params = toSignal(this.route$.paramMap, { initialValue: this.route$.snapshot.paramMap });
  protected readonly routeId = computed(() => this.params()?.get('routeId') ?? '');
  protected readonly route = computed(() => this.storage.getRoute(this.routeId()));

  protected readonly activeSegmentIndex = signal(0);
  protected readonly activeDayIndex = signal(0);
  protected readonly exporting = signal(false);
  protected readonly message = signal<{ text: string; error: boolean } | null>(null);

  protected readonly activeSegment = computed(() => this.route()?.segments[this.activeSegmentIndex()]);
  protected readonly activeDay = computed(() => this.activeSegment()?.dailyPlan?.[this.activeDayIndex()]);

  private readonly placeLookup = computed(() => {
    const map = new Map<string, Place>();
    for (const segment of this.route()?.segments ?? []) {
      for (const place of segment.selectedPlaces) {
        map.set(place.id, place);
      }
    }
    return map;
  });

  private map?: L.Map;
  private layer?: L.LayerGroup;

  constructor() {
    patchLeafletDefaultIcon();
  }

  ngAfterViewInit(): void {
    if (!this.mapContainer) return;
    this.map = L.map(this.mapContainer.nativeElement);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);

    effect(() => this.renderDayRoute(), { injector: this.injector });
  }

  private renderDayRoute(): void {
    if (!this.map || !this.layer) return;
    this.layer.clearLayers();

    const day = this.activeDay();
    const lookup = this.placeLookup();
    if (!day || day.items.length === 0) return;

    const ordered = [...day.items].sort((a, b) => a.order - b.order);
    const points: L.LatLngExpression[] = [];

    ordered.forEach((item: PlanItem, index) => {
      const place = lookup.get(item.placeId);
      if (!place) return;
      const point: L.LatLngExpression = [place.coordinates.lat, place.coordinates.lng];
      points.push(point);
      L.marker(point)
        .addTo(this.layer!)
        .bindTooltip(`${index + 1}. ${place.name}`);
    });

    if (points.length > 1) {
      L.polyline(points, { color: '#2563eb', weight: 3 }).addTo(this.layer);
    }
    if (points.length > 0) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
    }
  }

  protected placeName(placeId: string): string {
    return this.placeLookup().get(placeId)?.name ?? placeId;
  }

  protected selectSegment(index: number): void {
    this.activeSegmentIndex.set(index);
    this.activeDayIndex.set(0);
  }

  protected downloadPdf(): void {
    const r = this.route();
    if (!r) return;

    this.exporting.set(true);
    this.message.set(null);
    this.api.exportPdf(r).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${r.title}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: async (error) => {
        this.exporting.set(false);
        if (error.status === 501) {
          const body = await (error.error as Blob).text();
          const parsed = JSON.parse(body) as { message?: string };
          this.message.set({ text: parsed.message ?? 'Экспорт в PDF пока недоступен', error: false });
        } else {
          this.message.set({ text: 'Не удалось выполнить экспорт в PDF', error: true });
        }
      },
    });
  }
}
