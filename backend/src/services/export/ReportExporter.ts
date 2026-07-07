import { Route } from '../../models/types';

export interface ReportExporter {
  exportToPdf(route: Route): Promise<Buffer>;
}

export class NotImplementedError extends Error {
  constructor(message = 'Not implemented') {
    super(message);
    this.name = 'NotImplementedError';
  }
}
