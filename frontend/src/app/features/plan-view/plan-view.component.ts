import { AfterViewInit, Component, ElementRef, Injector, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { RouteApiService } from '../../core/services/route-api.service';
import { RouteStorageService } from '../../core/services/route-storage.service';
import { patchLeafletDefaultIcon } from '../../shared/leaflet-icon-fix';
import { Place, PlanItem } from '../../shared/models/route.model';

function numberedIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: 'numbered-marker',
    html: `${n}`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

@Component({
  selector: 'app-plan-view',
  imports: [RouterLink],
  template: `
    @if (route(); as r) {
      <div class="page page-wide">
        <a routerLink="/routes" class="text-muted back">← К списку маршрутов</a>

        <div class="screen-card">
          <div class="header">
            <div>
              <div class="eyebrow">Готовый план</div>
              <h2>{{ r.title }}</h2>
              <p class="text-muted city-chain">{{ cityChain() }}</p>
            </div>
            <button class="btn" (click)="downloadPdf()" [disabled]="exporting()">
              ⬇ {{ exporting() ? 'Экспортируем…' : 'Скачать PDF-отчёт' }}
            </button>
          </div>

          <div class="segment-tabs">
            @for (segment of r.segments; track segment.id; let i = $index) {
              <button
                class="seg-tab"
                [class.active]="i === activeSegmentIndex()"
                (click)="selectSegment(i)"
              >
                {{ segment.city }}
              </button>
            }
          </div>

          <div class="day-tabs-row">
            @if (activeSegment(); as seg) {
              @for (day of seg.dailyPlan; track day.date; let i = $index) {
                <button class="pill day-pill" [class.active]="i === activeDayIndex()" (click)="activeDayIndex.set(i)">
                  День {{ i + 1 }}
                </button>
              }
            }
          </div>

          @if (activeDay(); as day) {
            <div class="layout">
              <div class="list-panel">
                @for (item of day.items; track item.placeId; let last = $last) {
                  <div class="timeline-row">
                    <div class="timeline">
                      <div class="dot"></div>
                      <div class="connector" [class.hidden]="last"></div>
                    </div>
                    <div class="item-card">
                      <div class="item-main">
                        <span class="item-name">{{ placeName(item.placeId) }}</span>
                        @if (item.suggestedArrivalTime) {
                          <span class="item-time">{{ item.suggestedArrivalTime }}</span>
                        }
                      </div>
                      <div class="text-muted item-detail">
                        @if (item.suggestedDurationMinutes) {
                          <span>~{{ item.suggestedDurationMinutes }} мин</span>
                        }
                        <span>{{ placeCategory(item.placeId) }}</span>
                      </div>
                      @if (item.travelNoteToNext) {
                        <div class="item-note">→ {{ item.travelNoteToNext }}</div>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="map-panel">
                <div #mapContainer class="map"></div>
              </div>
            </div>
          }
        </div>

        @if (message(); as m) {
          <div class="toast" [class.toast-error]="m.error">{{ m.text }}</div>
        }
      </div>
    } @else {
      <div class="page"><p class="text-muted">Маршрут не найден.</p></div>
    }
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 16px; font-size: 14px; }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 26px 40px 0;
      gap: 16px;
    }
    h2 { margin: 0; font-size: 26px; font-weight: 600; }
    .city-chain { margin-top: 4px; font-size: 13px; }
    .segment-tabs { display: flex; gap: 8px; padding: 22px 40px 0; }
    .seg-tab {
      padding: 10px 18px;
      border-radius: 10px 10px 0 0;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: var(--color-text-muted);
      background: transparent;
      border: 1px solid transparent;
    }
    .seg-tab.active {
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-bottom-color: var(--color-surface);
    }
    .day-tabs-row {
      padding: 18px 40px;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--color-border);
    }
    .day-pill {
      background: var(--color-page);
      border-color: transparent;
      color: var(--color-text-muted);
    }
    .day-pill.active {
      background: var(--color-accent-tint);
      color: var(--color-accent);
      border-color: var(--color-accent-tint);
    }
    .layout { display: grid; grid-template-columns: 1fr 460px; }
    .list-panel { padding: 24px 40px; display: flex; flex-direction: column; gap: 0; }
    .timeline-row { display: flex; gap: 16px; align-items: flex-start; }
    .timeline { display: flex; flex-direction: column; align-items: center; padding-top: 2px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-accent); flex-shrink: 0; }
    .connector { width: 1.5px; flex: 1; background: var(--color-border-soft); min-height: 36px; }
    .connector.hidden { background: transparent; }
    .item-card {
      flex: 1;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 16px 18px;
      margin: 0 0 12px;
    }
    .item-main { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .item-name { font-size: 15px; font-weight: 600; }
    .item-time { font-size: 13px; color: var(--color-accent); font-weight: 600; white-space: nowrap; }
    .item-detail { font-size: 13px; margin-top: 4px; display: flex; gap: 6px; }
    .item-detail span:not(:last-child)::after { content: '·'; margin-left: 6px; }
    .item-note {
      font-size: 12.5px;
      color: var(--color-text-soft);
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed var(--color-border);
    }
    .map-panel { padding: 24px 40px 24px 0; }
    .map { height: 100%; min-height: 420px; border-radius: var(--radius-md); overflow: hidden; }
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
  protected readonly cityChain = computed(() => this.route()?.segments.map((s) => s.city).join(' → ') ?? '');

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
      L.marker(point, { icon: numberedIcon(index + 1) })
        .addTo(this.layer!)
        .bindTooltip(`${index + 1}. ${place.name}`);
    });

    if (points.length > 1) {
      L.polyline(points, { color: '#3b6e5e', weight: 3, dashArray: '7 6' }).addTo(this.layer);
    }
    if (points.length > 0) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
    }
  }

  protected placeName(placeId: string): string {
    return this.placeLookup().get(placeId)?.name ?? placeId;
  }

  protected placeCategory(placeId: string): string {
    return this.placeLookup().get(placeId)?.category ?? '';
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
