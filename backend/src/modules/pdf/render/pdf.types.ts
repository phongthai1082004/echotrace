export type OrderPdfJobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export const PDF_MAX_ATTEMPTS = 5;
export const PDF_FOLDER = 'echotrace/pdfs';

// 'TEMPLATE' / 'TRAVEL' render được, 'ALBUM' thì không cần PDF in).
export function isRenderableBookType(type?: string | null): boolean {
	return (type ?? '').toLowerCase() !== 'album';
}

export interface IOrderPdfRenderer {
	renderOrderToPdf(orderId: number): Promise<Buffer>;
}

export interface IR2FileService {
	uploadBuffer(buffer: Buffer, folder?: string): Promise<string>;
}

export interface IPdfQueue {
	enqueue(orderId: number): Promise<void>;
}
