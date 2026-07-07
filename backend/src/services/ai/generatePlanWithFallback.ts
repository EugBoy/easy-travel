import { RouteSegmentInput } from '../../models/types';
import { AiPlannerService, PlanGenerationResult } from './AiPlannerService';
import { buildFallbackDailyPlan } from './fallbackPlanner';

export async function generatePlanWithFallback(
  planner: AiPlannerService | undefined,
  segment: RouteSegmentInput,
): Promise<PlanGenerationResult> {
  if (!planner) {
    return {
      dailyPlan: buildFallbackDailyPlan(segment),
      aiGenerated: false,
      warning: 'AI-сервис не настроен. План распределён по дням без оптимизации.',
    };
  }

  try {
    const dailyPlan = await planner.generatePlanForSegment(segment);
    return { dailyPlan, aiGenerated: true };
  } catch (error) {
    return {
      dailyPlan: buildFallbackDailyPlan(segment),
      aiGenerated: false,
      warning: `План сгенерирован без AI-оптимизации: ${(error as Error).message}`,
    };
  }
}
