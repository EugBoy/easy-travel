import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'ru' | 'en';

const STORAGE_KEY = 'easy-travel.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly langSignal = signal<AppLanguage>(this.readInitial());
  readonly lang = this.langSignal.asReadonly();

  private readInitial(): AppLanguage {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ru';
  }

  setLang(lang: AppLanguage): void {
    localStorage.setItem(STORAGE_KEY, lang);
    this.langSignal.set(lang);
  }
}
