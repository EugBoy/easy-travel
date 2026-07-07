import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RouteStorageService } from '../../core/services/route-storage.service';
import { CityAutocompleteComponent } from '../../shared/components/city-autocomplete/city-autocomplete.component';
import { CitySearchResult } from '../../shared/models/route.model';
import {
  arrivalBeforeDepartureValidator,
  citySelectedValidator,
  segmentSequenceValidator,
} from '../../shared/validators/route-form.validators';

function pluralizeRu(count: number, [one, few, many]: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

@Component({
  selector: 'app-route-form',
  imports: [ReactiveFormsModule, RouterLink, CityAutocompleteComponent],
  template: `
    <div class="page">
      <a routerLink="/routes" class="text-muted back">← К списку маршрутов</a>

      <div class="screen-card">
        <div class="card-top">
          <div class="eyebrow">Новый маршрут</div>
          <h1>Соберите план поездки по городам</h1>
          <p class="subtitle text-soft">
            Добавьте города, которые хотите посетить, и даты пребывания в каждом. Порядок отрезков определяет маршрут путешествия.
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="card-body">
            <div class="field title-field">
              <label>Название поездки</label>
              <input class="input" type="text" formControlName="title" placeholder="Например, Отпуск в Португалии" />
            </div>

            <div class="segments" formArrayName="segments">
              @for (segment of segments.controls; track segment; let i = $index) {
                <div class="segment-row">
                  <div [formGroupName]="i" class="segment-main">
                    <div class="timeline">
                      <div class="num-circle">{{ i + 1 }}</div>
                      <div class="connector"></div>
                    </div>

                    <div class="segment-grid">
                      <app-city-autocomplete
                        [initialValue]="segment.get('city')?.value"
                        (selected)="onCitySelected(i, $event)"
                        (cleared)="onCityCleared(i)"
                      />
                      <div class="field">
                        <label>Прибытие</label>
                        <input class="input" type="date" formControlName="arrivalDate" />
                      </div>
                      <div class="field">
                        <label>Отъезд</label>
                        <input class="input" type="date" formControlName="departureDate" />
                      </div>
                    </div>

                    <div class="row-actions">
                      <button type="button" class="icon-btn" [disabled]="i === 0" (click)="moveUp(i)" aria-label="Переместить вверх">↑</button>
                      <button type="button" class="icon-btn" [disabled]="i === segments.length - 1" (click)="moveDown(i)" aria-label="Переместить вниз">↓</button>
                      <button type="button" class="icon-btn icon-btn-danger" [disabled]="segments.length === 1" (click)="removeSegment(i)" aria-label="Удалить">✕</button>
                    </div>
                  </div>

                  @if (submitted && segment.hasError('citySelected')) {
                    <p class="error">Выберите город из списка предложений</p>
                  }
                  @if (submitted && segment.hasError('arrivalAfterDeparture')) {
                    <p class="error">Дата отъезда должна быть не раньше даты прибытия</p>
                  }
                  @if (submitted && segments.hasError('sequenceBroken') && segments.errors?.['sequenceBroken'] === i) {
                    <p class="error">Дата прибытия не может быть раньше даты отъезда предыдущего отрезка</p>
                  }
                </div>
              }
            </div>

            <div class="add-city" (click)="addSegment()">
              <span class="plus">+</span> Добавить город
            </div>
          </div>

          <div class="card-footer">
            <div class="text-muted footer-info">
              {{ segments.length }} {{ segmentWord() }} маршрута · {{ totalNights() }} {{ nightsWord() }} всего
            </div>
            <button type="submit" class="btn btn-primary">Создать маршрут →</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 16px; font-size: 14px; }
    .card-top { padding: 40px 48px 8px; }
    h1 { margin: 10px 0 6px; font-size: 34px; font-weight: 600; letter-spacing: -0.01em; }
    .subtitle { margin: 0 0 32px; font-size: 15px; line-height: 1.5; max-width: 560px; }
    .card-body { padding: 0 48px 40px; display: flex; flex-direction: column; gap: 14px; }
    .title-field { margin-bottom: 6px; }
    .segments { display: flex; flex-direction: column; gap: 14px; }
    .segment-row { display: flex; flex-direction: column; gap: 6px; }
    .segment-main {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 20px 22px;
    }
    .timeline { display: flex; flex-direction: column; align-items: center; gap: 6px; padding-top: 4px; align-self: stretch; }
    .num-circle {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--color-text); color: var(--color-bg);
      font-size: 13px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .connector { width: 1px; flex: 1; background: var(--color-border); }
    .segment-grid { flex: 1; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 16px; min-width: 0; }
    .row-actions { display: flex; gap: 6px; padding-top: 26px; }
    .error { color: var(--color-danger); font-size: 13px; padding-left: 4px; }
    .add-city {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1.5px dashed var(--color-border-dashed);
      border-radius: var(--radius-md);
      padding: 16px 22px;
      color: var(--color-accent);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .plus { font-size: 18px; line-height: 1; }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 48px;
      border-top: 1px solid var(--color-border);
      background: var(--color-page);
    }
    .footer-info { font-size: 13px; }
    @media (max-width: 720px) {
      .segment-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class RouteFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(RouteStorageService);
  private readonly router = inject(Router);

  protected submitted = false;

  protected readonly form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    segments: this.fb.array([this.createSegmentGroup()], segmentSequenceValidator),
  });

  protected get segments(): FormArray {
    return this.form.get('segments') as FormArray;
  }

  private createSegmentGroup(): FormGroup {
    return this.fb.group(
      {
        city: ['', Validators.required],
        countryCode: [null],
        lat: [null],
        lng: [null],
        bboxSouth: [null],
        bboxNorth: [null],
        bboxWest: [null],
        bboxEast: [null],
        arrivalDate: ['', Validators.required],
        departureDate: ['', Validators.required],
      },
      { validators: [citySelectedValidator, arrivalBeforeDepartureValidator] },
    );
  }

  protected addSegment(): void {
    this.segments.push(this.createSegmentGroup());
  }

  protected removeSegment(index: number): void {
    this.segments.removeAt(index);
  }

  protected moveUp(index: number): void {
    if (index === 0) return;
    this.swapSegments(index, index - 1);
  }

  protected moveDown(index: number): void {
    if (index === this.segments.length - 1) return;
    this.swapSegments(index, index + 1);
  }

  private swapSegments(i: number, j: number): void {
    const a = this.segments.at(i).value;
    const b = this.segments.at(j).value;
    this.segments.at(i).patchValue(b);
    this.segments.at(j).patchValue(a);
  }

  protected onCitySelected(index: number, city: CitySearchResult): void {
    this.segments.at(index).patchValue({
      city: city.name,
      countryCode: city.countryCode ?? null,
      lat: city.coordinates.lat,
      lng: city.coordinates.lng,
      bboxSouth: city.boundingBox?.south ?? null,
      bboxNorth: city.boundingBox?.north ?? null,
      bboxWest: city.boundingBox?.west ?? null,
      bboxEast: city.boundingBox?.east ?? null,
    });
  }

  protected onCityCleared(index: number): void {
    this.segments.at(index).patchValue({
      lat: null,
      lng: null,
      bboxSouth: null,
      bboxNorth: null,
      bboxWest: null,
      bboxEast: null,
    });
  }

  protected totalNights(): number {
    return this.segments.controls.reduce((sum, ctrl) => {
      const arrival = ctrl.get('arrivalDate')?.value;
      const departure = ctrl.get('departureDate')?.value;
      if (!arrival || !departure) return sum;
      const diff = Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86_400_000);
      return sum + Math.max(0, diff);
    }, 0);
  }

  protected segmentWord(): string {
    return pluralizeRu(this.segments.length, ['отрезок', 'отрезка', 'отрезков']);
  }

  protected nightsWord(): string {
    return pluralizeRu(this.totalNights(), ['ночь', 'ночи', 'ночей']);
  }

  protected submit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const title = this.form.value.title as string;
    const segments = (this.form.value.segments as {
      city: string;
      countryCode: string | null;
      lat: number;
      lng: number;
      bboxSouth: number | null;
      bboxNorth: number | null;
      bboxWest: number | null;
      bboxEast: number | null;
      arrivalDate: string;
      departureDate: string;
    }[]).map((segment, order) => ({
      order,
      city: segment.city,
      countryCode: segment.countryCode ?? undefined,
      coordinates: { lat: segment.lat, lng: segment.lng },
      boundingBox:
        segment.bboxSouth != null && segment.bboxNorth != null && segment.bboxWest != null && segment.bboxEast != null
          ? { south: segment.bboxSouth, north: segment.bboxNorth, west: segment.bboxWest, east: segment.bboxEast }
          : undefined,
      arrivalDate: segment.arrivalDate,
      departureDate: segment.departureDate,
    }));

    const route = this.storage.createRoute(title, segments);
    this.router.navigate(['/routes', route.id, 'segments', 0]);
  }
}
