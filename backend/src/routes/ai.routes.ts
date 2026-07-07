import { Router } from 'express';
import { AiPlannerService } from '../services/ai/AiPlannerService';
import { generatePlanWithFallback } from '../services/ai/generatePlanWithFallback';
import { GeneratePlanResponse } from '../models/types';
import { generatePlanRequestSchema } from '../validation/requestSchemas';

export function createAiRouter(planner: AiPlannerService | undefined): Router {
  const router = Router();

  router.post('/generate-plan', async (req, res) => {
    const parsed = generatePlanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body', issues: parsed.error.issues });
      return;
    }

    const results = await Promise.all(
      parsed.data.segments.map(async (segment) => {
        const result = await generatePlanWithFallback(planner, segment);
        return {
          segmentId: segment.id,
          dailyPlan: result.dailyPlan,
          aiGenerated: result.aiGenerated,
          warning: result.warning,
        };
      }),
    );

    const response: GeneratePlanResponse & { warnings?: string[] } = {
      segments: results.map(({ segmentId, dailyPlan, aiGenerated }) => ({
        segmentId,
        dailyPlan,
        aiGenerated,
      })),
      warnings: results.filter((r) => r.warning).map((r) => r.warning as string),
    };

    res.json(response);
  });

  return router;
}
