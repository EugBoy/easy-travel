import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createAiRouter } from './routes/ai.routes';
import { createExportRouter } from './routes/export.routes';
import { createPlacesRouter } from './routes/places.routes';
import { AnthropicAiPlannerService } from './services/ai/AnthropicAiPlannerService';
import { AiPlannerService } from './services/ai/AiPlannerService';
import { PdfReportExporter } from './services/export/PdfReportExporter';
import { OverpassPlacesProvider } from './services/places/OverpassPlacesProvider';

const app = express();
app.use(cors());
app.use(express.json());

const placesProvider = new OverpassPlacesProvider();
const reportExporter = new PdfReportExporter();

const { AI_SERVICE_URL, AI_SERVICE_API_KEY, AI_SERVICE_MODEL } = process.env;
const aiPlanner: AiPlannerService | undefined =
  AI_SERVICE_URL && AI_SERVICE_API_KEY && AI_SERVICE_MODEL
    ? new AnthropicAiPlannerService({
        serviceUrl: AI_SERVICE_URL,
        apiKey: AI_SERVICE_API_KEY,
        model: AI_SERVICE_MODEL,
      })
    : undefined;

if (!aiPlanner) {
  console.warn('AI_SERVICE_URL / AI_SERVICE_API_KEY / AI_SERVICE_MODEL not fully set — falling back to non-AI plan generation.');
}

app.use('/api/places', createPlacesRouter(placesProvider));
app.use('/api/ai', createAiRouter(aiPlanner));
app.use('/api/export', createExportRouter(reportExporter));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
