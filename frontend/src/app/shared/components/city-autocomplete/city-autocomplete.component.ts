import { Component, ElementRef, HostListener, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { RouteApiService } from '../../../core/services/route-api.service';
import { CitySearchResult } from '../../models/route.model';

@Component({
  selector: 'app-city-autocomplete',
  template: `
    <div class="field">
      <label>Город</label>
      <div class="input-wrap">
        <span class="input-dot"></span>
        <input
          class="input"
          type="text"
          placeholder="Начните вводить название города"
          [value]="query()"
          (input)="onInput($event)"
          autocomplete="off"
        />
      </div>
      @if (suggestions().length > 0) {
        <ul class="suggestions">
          @for (city of suggestions(); track city.displayName) {
            <li (click)="select(city)">
              <span class="name">{{ city.name }}</span>
              <span class="text-muted detail">{{ city.displayName }}</span>
            </li>
          }
        </ul>
      }
      @if (loading()) {
        <span class="text-muted hint">Поиск…</span>
      }
    </div>
  `,
  styles: [`
    :host { position: relative; display: block; }
    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-dot {
      position: absolute;
      left: 14px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-accent);
      pointer-events: none;
    }
    .input-wrap .input {
      padding-left: 28px;
    }
    .suggestions {
      position: absolute;
      z-index: 20;
      top: 100%;
      left: 0;
      right: 0;
      margin: 4px 0 0;
      padding: 4px;
      list-style: none;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-card);
      max-height: 220px;
      overflow-y: auto;
    }
    .suggestions li {
      display: flex;
      flex-direction: column;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
    }
    .suggestions li:hover { background: var(--color-accent-tint); }
    .name { font-weight: 600; font-size: 14px; }
    .detail { font-size: 12px; }
    .hint { font-size: 12px; margin-top: 4px; }
  `],
})
export class CityAutocompleteComponent {
  readonly initialValue = input<string>('');
  readonly selected = output<CitySearchResult>();
  readonly cleared = output<void>();

  private readonly api = inject(RouteApiService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly query = signal(this.initialValue());
  protected readonly suggestions = signal<CitySearchResult[]>([]);
  protected readonly loading = signal(false);

  constructor() {
    // Keeps the field in sync when the parent reorders/patches segments (e.g. move up/down).
    effect(() => {
      const value = this.initialValue();
      if (untracked(this.query) !== value) {
        this.query.set(value);
      }
    });

    toObservable(this.query)
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 2) {
            this.loading.set(false);
            return [];
          }
          this.loading.set(true);
          return this.api.searchCities(query.trim());
        }),
      )
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          if ('cities' in result) {
            this.suggestions.set(result.cities);
          }
        },
        error: () => {
          this.loading.set(false);
          this.suggestions.set([]);
        },
      });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.cleared.emit();
  }

  protected select(city: CitySearchResult): void {
    this.query.set(city.name);
    this.suggestions.set([]);
    this.selected.emit(city);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.suggestions.set([]);
    }
  }
}
