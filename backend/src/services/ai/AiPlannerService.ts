import { DailyPlan, RouteSegmentInput } from '../../models/types';

export interface PlanGenerationResult {
  dailyPlan: DailyPlan[];
  aiGenerated: boolean;
  warning?: string;
}

export interface AiPlannerService {
  /** Throws if the LLM call fails or returns an invalid response. */
  generatePlanForSegment(segment: RouteSegmentInput): Promise<DailyPlan[]>;
}
