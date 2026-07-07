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
      <header class="header">
        <div>
          <h1>Мои маршруты</h1>
          <p class="text-muted">Спланируйте поездку по городам и достопримечательностям</p>
        </div>
        <a class="btn btn-primary" routerLink="/routes/new">+ Новый маршрут</a>
      </header>

      @if (storage.routes().length === 0) {
        <div class="card empty">
          <p class="text-muted">Пока нет ни одного маршрута.</p>
          <a class="btn btn-primary" routerLink="/routes/new">Создать первый маршрут</a>
        </div>
      } @else {
        <div class="list">
          @for (route of storage.routes(); track route.id) {
            <div class="card route-card">
              <div class="route-info">
                <h3>{{ route.title }}</h3>
                <p class="text-muted cities">{{ cityList(route.segments) }}</p>
              </div>
              <div class="route-meta">
                <span class="badge" [class.badge-success]="route.status === 'plan_generated'">
                  {{ statusLabel(route.status) }}
                </span>
                <div class="actions">
                  <button class="btn" (click)="open(route)">Открыть</button>
                  <button class="btn btn-danger" (click)="remove(route.id)">Удалить</button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 32px;
      gap: 16px;
    }
    .header p { margin-top: 4px; }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .route-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .cities { margin-top: 4px; font-size: 14px; }
    .route-meta {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
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
