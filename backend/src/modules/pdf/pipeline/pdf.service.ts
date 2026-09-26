import { injectable, inject } from 'tsyringe';
import {PDF_FOLDER, isRenderableBookType} from '../render/pdf.types.js';
import type {IOrderPdfRenderer, IR2FileService} from '../render/pdf.types.js';
import { PdfRepository } from '../storage/pdf.repository.js';

@injectable()
export class PdfService {
	constructor(
		@inject('IOrderPdfRenderer') private renderer: IOrderPdfRenderer,
		@inject('IR2FileService') private r2: IR2FileService,
		@inject('PdfRepository') private pdfRepo: PdfRepository,
	) {}

	async process(jobId: number, orderId: number): Promise<void> {
		const pdfBuf = await this.renderer.renderOrderToPdf(orderId);
		const url = await this.r2.uploadBuffer(pdfBuf, PDF_FOLDER);

		const order = await this.pdfRepo.findOrderById(orderId);
		const items: any[] = Array.isArray(order?.orderItems) ? order!.orderItems : [];

		const bookIds = items.map((i) => i?.bookId).filter((id: any) => typeof id === 'number');
		const books = bookIds.length
			? await this.pdfRepo.findBooksByIds(bookIds)
			: [];
		const renderable = new Set(books.filter((b) => isRenderableBookType(b.type)).map((b) => b.id));

		const newItems = items.map((it) => (renderable.has(it?.bookId) ? { ...it, pdfUrl: url } : it));

		await this.pdfRepo.client.$transaction([
			this.pdfRepo.updateOrderPdf(orderId, url, newItems),
			this.pdfRepo.markPdfJobDone(jobId, url),
		]);
	}
}
