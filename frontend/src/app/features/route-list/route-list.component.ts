import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RouteStorageService } from '../../core/services/route-storage.service';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Черновик',
  places_selected: 'Места выбраны',
  plan_generated: 'План готов',
};

@Component({
  selector: 'app-route-list',
  imports: [RouterLink],
  template: `
    <div class="page">
      <div class="screen-card">
        <div class="card-top">
          <div class="eyebrow">Планировщик поездок</div>
          <h1>Мои маршруты</h1>
          <p class="subtitle text-soft">Спланируйте поездку по городам и достопримечательностям</p>
        </div>

        <div class="card-body">
          @if (storage.routes().length === 0) {
            <div class="empty">
              <p class="text-muted">Пока нет ни одного маршрута.</p>
            </div>
          } @else {
            <div class="list">
              @for (route of storage.routes(); track route.id) {
                <div class="route-row">
                  <div class="dot"></div>
                  <div class="route-info">
                    <div class="route-title">{{ route.title }}</div>
                    <div class="text-muted cities">{{ cityList(route.segments) }}</div>
                  </div>
                  <span class="badge" [class.badge-accent]="route.status === 'plan_generated'">
                    {{ statusLabel(route.status) }}
                  </span>
                  <div class="actions">
                    <button class="btn" (click)="open(route)">Открыть</button>
                    <button class="icon-btn icon-btn-danger" (click)="remove(route.id)" aria-label="Удалить">✕</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="card-footer">
          <div class="text-muted footer-count">{{ storage.routes().length }} маршрут(ов)</div>
          <a class="btn btn-primary" routerLink="/routes/new">+ Новый маршрут</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-top { padding: 40px 48px 8px; }
    h1 { margin: 10px 0 6px; font-size: 34px; font-weight: 600; letter-spacing: -0.01em; }
    .subtitle { margin: 0 0 32px; font-size: 15px; line-height: 1.5; max-width: 560px; }
    .card-body { padding: 0 48px 40px; }
    .empty { padding: 32px 0; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .route-row {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 18px 22px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); flex-shrink: 0; }
    .route-info { flex: 1; min-width: 0; }
    .route-title { font-size: 15px; font-weight: 600; }
    .cities { margin-top: 4px; font-size: 13px; }
    .actions { display: flex; align-items: center; gap: 8px; }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 48px;
      border-top: 1px solid var(--color-border);
      background: var(--color-page);
    }
    .footer-count { font-size: 13px; }
  `],
})
export class RouteListComponent {
  protected readonly storage = inject(RouteStorageService);
  private readonly router = inject(Router);

  protected statusLabel(status: string): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected cityList(segments: { city: string }[]): string {
    return segments.map((s) => s.city).join(' → ') || 'Нет отрезков';
  }

  protected open(route: { id: string; status: string }): void {
    if (route.status === 'plan_generated') {
      this.router.navigate(['/routes', route.id, 'plan']);
    } else {
      this.router.navigate(['/routes', route.id, 'segments', 0]);
    }
  }

  protected remove(routeId: string): void {
    this.storage.deleteRoute(routeId);
  }
}
