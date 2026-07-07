import { RouteSegmentInput, DailyPlan } from '../../models/types';
import { llmPlanResponseSchema } from '../../validation/dailyPlanSchema';
import { AiPlannerService } from './AiPlannerService';

interface AnthropicConfig {
  serviceUrl: string;
  apiKey: string;
  model: string;
}

function buildPrompt(segment: RouteSegmentInput): string {
  const placesList = segment.selectedPlaces
    .map((p) => `- id: ${p.id}, name: "${p.name}", category: ${p.category}, lat: ${p.coordinates.lat}, lng: ${p.coordinates.lng}`)
    .join('\n');

  return `Ты планируешь маршрут поездки по городу "${segment.city}" с ${segment.arrivalDate} по ${segment.departureDate}.
Вот список выбранных пользователем мест:
${placesList}

Распредели эти места по дням поездки (каждый день — отдельная дата в диапазоне от даты прибытия включительно до даты отъезда), учитывая логичную географическую последовательность посещения (близкие места — в один день и рядом друг с другом по порядку).

Ответь ТОЛЬКО валидным JSON без пояснений, строго в формате:
{
  "dailyPlan": [
    {
      "date": "YYYY-MM-DD",
      "items": [
        { "placeId": "...", "order": 0, "suggestedArrivalTime": "HH:MM", "suggestedDurationMinutes": 60, "travelNoteToNext": "..." }
      ]
    }
  ]
}`;
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('LLM response does not contain a JSON object');
  }
  return JSON.parse(text.slice(start, end + 1));
}

export class AnthropicAiPlannerService implements AiPlannerService {
  constructor(private readonly config: AnthropicConfig) {}

  async generatePlanForSegment(segment: RouteSegmentInput): Promise<DailyPlan[]> {
    const response = await fetch(this.config.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 2048,
        system: 'Ты — ассистент по планированию туристических маршрутов. Всегда отвечай строго валидным JSON без markdown-разметки и пояснений.',
        messages: [{ role: 'user', content: buildPrompt(segment) }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service request failed: ${response.status}`);
    }

    const body = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = body.content?.find((block) => block.type === 'text')?.text;
    if (!text) {
      throw new Error('AI service returned no text content');
    }

    const parsed = llmPlanResponseSchema.parse(extractJson(text));
    return parsed.dailyPlan;
  }
}
