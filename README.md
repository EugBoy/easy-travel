# Travel Route Planner

Веб-приложение для планирования маршрутов путешествий: несколько городов, подбор
достопримечательностей на карте и генерация дневного плана поездки с помощью LLM.

## Стек

- **Frontend**: Angular 22 (standalone components, signals, `@if`/`@for`), TypeScript, Leaflet + OpenStreetMap.
- **Backend**: Node.js + Express + TypeScript. Полностью **stateless** — данные маршрутов не хранятся на сервере.
- **Хранилище данных**: на этом этапе все маршруты хранятся в **LocalStorage браузера** (`RouteStorageService`).
  Backend используется только как прокси к внешним сервисам (поиск мест, AI-генерация плана) и как заглушка экспорта в PDF.
- **Поиск мест**: Overpass API (достопримечательности) + Nominatim (поиск городов) — оба через `PlacesProvider`,
  реализация подменяется без изменений в остальном коде.
- **AI-планировщик**: любой REST LLM-провайдер (по умолчанию — формат Anthropic Messages API), с валидацией
  ответа через Zod и fallback-распределением мест по дням, если AI недоступен.

## Структура проекта

```
/frontend         Angular 22 приложение
  /src/app
    /features/route-list     список сохранённых маршрутов
    /features/route-form     форма создания маршрута (динамические отрезки)
    /features/segment-view   карта + список мест по отрезку
    /features/plan-view      итоговый план по дням + экспорт в PDF (заглушка)
    /core/services           RouteStorageService (LocalStorage), RouteApiService (HTTP)
    /shared/models           TS-модели Route/RouteSegment/Place/DailyPlan
/backend           Express-приложение
  /src
    /routes                  places / ai / export роуты
    /services/places         PlacesProvider + OverpassPlacesProvider
    /services/ai             AiPlannerService + Anthropic-реализация + fallback
    /services/export         ReportExporter + заглушка PdfReportExporter (501)
    /validation              Zod-схемы запросов и ответа LLM
  .env.example
```

## Запуск

### Backend

```bash
cd backend
npm install
cp .env.example .env   # заполните AI_SERVICE_URL / AI_SERVICE_API_KEY / AI_SERVICE_MODEL при наличии
npm run dev             # http://localhost:3000
```

Если переменные AI-сервиса не заданы, `/api/ai/generate-plan` продолжит работать, но будет
распределять выбранные места по дням поровну (без AI-оптимизации) и вернёт предупреждение об этом.

### Frontend

```bash
cd frontend
npm install
npm start                # http://localhost:4200
```

Backend должен быть запущен на `http://localhost:3000` (адрес задан в `src/app/core/config.ts`).

## Переменные окружения (`backend/.env`)

```
AI_SERVICE_URL=
AI_SERVICE_API_KEY=
AI_SERVICE_MODEL=
PLACES_PROVIDER=overpass
PORT=3000
```

## Тесты

```bash
cd backend && npm test     # vitest
cd frontend && npm test    # vitest + jsdom
```

## Известные ограничения

- Nominatim (поиск городов) может блокировать запросы с датацентровых/облачных IP согласно своей usage policy —
  при необходимости замените `PlacesProvider` на другой источник геокодинга.
- Экспорт в PDF — заглушка: backend возвращает `501 Not Implemented`, frontend показывает это сообщение пользователю.
