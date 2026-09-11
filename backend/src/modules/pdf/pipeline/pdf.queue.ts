import { injectable, inject } from 'tsyringe';
import { IPdfQueue } from '../render/pdf.types.js';
import { PdfRepository } from '../storage/pdf.repository.js';

@injectable()
export class DbPdfQueue implements IPdfQueue {
	constructor(@inject('PdfRepository') private pdfRepo: PdfRepository) {}

	async enqueue(orderId: number): Promise<void> {
		// ponytail: idempotent — 1 order = 1 pdf job (unique orderId). Reset về PENDING để replay.
		await this.pdfRepo.upsertPdfJob(orderId);
	}
}
