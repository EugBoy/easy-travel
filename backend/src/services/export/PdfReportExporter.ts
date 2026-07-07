import { Route } from '../../models/types';
import { NotImplementedError, ReportExporter } from './ReportExporter';

/** Placeholder implementation — PDF generation is not built yet. */
export class PdfReportExporter implements ReportExporter {
  async exportToPdf(_route: Route): Promise<Buffer> {
    throw new NotImplementedError('PDF export coming soon');
  }
}
