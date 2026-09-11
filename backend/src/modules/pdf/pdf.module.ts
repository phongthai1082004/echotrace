import type { DependencyContainer } from 'tsyringe';
import { FabricRenderer } from './render/fabric.renderer.js';
import { R2FileService } from './storage/r2-file.service.js';
import { PdfService } from './pipeline/pdf.service.js';
import { PdfRepository } from './storage/pdf.repository.js';
import { DbPdfQueue } from './pipeline/pdf.queue.js';
import { PdfWorker } from './pipeline/pdf.worker.js';

export function registerPdf(container: DependencyContainer): void {
	container.registerSingleton('IOrderPdfRenderer', FabricRenderer);
	container.registerSingleton('IR2FileService', R2FileService);
	container.registerSingleton('PdfService', PdfService);
	container.registerSingleton('PdfRepository', PdfRepository);
	container.registerSingleton('IPdfQueue', DbPdfQueue);
	container.registerSingleton('PdfWorker', PdfWorker);
}
