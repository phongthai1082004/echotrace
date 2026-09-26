import { container, injectable, inject } from 'tsyringe';
import type {IPdfQueue} from '../render/pdf.types.js';
import { PdfRepository } from '../storage/pdf.repository.js';

@injectable()
export class DbPdfQueue implements IPdfQueue {
	constructor(@inject('PdfRepository') private pdfRepo: PdfRepository) {}

	async enqueue(orderId: number): Promise<void> {
		await this.pdfRepo.upsertPdfJob(orderId);
		try {
			container.resolve<{ kick?: () => void }>('PdfWorker')?.kick?.();
		} catch {
			/* worker chưa đăng ký (test) — poll loop sẽ tự bắt */
		}
	}
}
