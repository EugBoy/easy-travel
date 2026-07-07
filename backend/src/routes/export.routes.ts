import { Router } from 'express';
import { ReportExporter, NotImplementedError } from '../services/export/ReportExporter';
import { routeSchema } from '../validation/requestSchemas';

export function createExportRouter(reportExporter: ReportExporter): Router {
  const router = Router();

  router.post('/pdf', async (req, res) => {
    const parsed = routeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid route payload', issues: parsed.error.issues });
      return;
    }
    if (parsed.data.status !== 'plan_generated') {
      res.status(422).json({ message: 'Route plan has not been generated yet' });
      return;
    }

    try {
      const buffer = await reportExporter.exportToPdf(parsed.data);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(buffer);
    } catch (error) {
      if (error instanceof NotImplementedError) {
        res.status(501).json({ status: 'not_implemented', message: 'PDF export coming soon' });
        return;
      }
      res.status(500).json({ message: (error as Error).message });
    }
  });

  return router;
}
