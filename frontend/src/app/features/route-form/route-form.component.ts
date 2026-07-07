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

@Component({
  selector: 'app-route-form',
  imports: [ReactiveFormsModule, RouterLink, CityAutocompleteComponent],
  template: `
    <div class="page">
      <header class="header">
        <a routerLink="/routes" class="text-muted back">← К списку маршрутов</a>
        <h1>Новый маршрут</h1>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field title-field">
          <label>Название поездки</label>
          <input class="input" type="text" formControlName="title" placeholder="Например, Отпуск в Португалии" />
        </div>

        <div class="segments" formArrayName="segments">
          @for (segment of segments.controls; track segment; let i = $index) {
            <div class="card segment" [formGroupName]="i">
              <div class="segment-header">
                <span class="badge">Отрезок {{ i + 1 }}</span>
                @if (segments.length > 1) {
                  <button type="button" class="btn btn-ghost btn-danger" (click)="removeSegment(i)">Удалить</button>
                }
              </div>

              <app-city-autocomplete
                [initialValue]="segment.get('city')?.value"
                (selected)="onCitySelected(i, $event)"
                (cleared)="onCityCleared(i)"
              />
              @if (submitted && segment.hasError('citySelected')) {
                <p class="error">Выберите город из списка предложений</p>
              }

              <div class="dates">
                <div class="field">
                  <label>Дата прибытия</label>
                  <input class="input" type="date" formControlName="arrivalDate" />
                </div>
                <div class="field">
                  <label>Дата отъезда</label>
                  <input class="input" type="date" formControlName="departureDate" />
                </div>
              </div>
              @if (submitted && segment.hasError('arrivalAfterDeparture')) {
                <p class="error">Дата отъезда должна быть не раньше даты прибытия</p>
              }
              @if (submitted && segments.hasError('sequenceBroken') && segments.errors?.['sequenceBroken'] === i) {
                <p class="error">Дата прибытия не может быть раньше даты отъезда предыдущего отрезка</p>
              }
            </div>
          }
        </div>

        <div class="form-actions">
          <button type="button" class="btn" (click)="addSegment()">+ Добавить город</button>
          <button type="submit" class="btn btn-primary">Создать маршрут</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .header { margin-bottom: 24px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 14px; }
    .title-field { margin-bottom: 24px; }
    .segments {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }
    .segment {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .segment-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .error {
      color: var(--color-danger);
      font-size: 13px;
    }
    .form-actions {
      display: flex;
      justify-content: space-between;
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

  protected onCitySelected(index: number, city: CitySearchResult): void {
    this.segments.at(index).patchValue({
      city: city.name,
      countryCode: city.countryCode ?? null,
      lat: city.coordinates.lat,
      lng: city.coordinates.lng,
    });
  }

  protected onCityCleared(index: number): void {
    this.segments.at(index).patchValue({ lat: null, lng: null });
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
      arrivalDate: string;
      departureDate: string;
    }[]).map((segment, order) => ({
      order,
      city: segment.city,
      countryCode: segment.countryCode ?? undefined,
      coordinates: { lat: segment.lat, lng: segment.lng },
      arrivalDate: segment.arrivalDate,
      departureDate: segment.departureDate,
    }));

    const route = this.storage.createRoute(title, segments);
    this.router.navigate(['/routes', route.id, 'segments', 0]);
  }
}
