import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppLanguage, LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly language = inject(LanguageService);

  protected setLang(lang: AppLanguage): void {
    this.language.setLang(lang);
  }
}
