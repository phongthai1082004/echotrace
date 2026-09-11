export type OrderPdfJobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export const PDF_MAX_ATTEMPTS = 5;
export const PDF_FOLDER = 'echotrace/pdfs';

// ponytail: chỉ render PDF cho book không phải ALBUM (theo SampleBook.type:
// 'TEMPLATE' / 'TRAVEL' render được, 'ALBUM' thì không cần PDF in).
export function isRenderableBookType(type?: string | null): boolean {
	return (type ?? '').toLowerCase() !== 'album';
}

// ponytail: renderer contract — fabric JSON của các book → 1 file PDF Buffer.
export interface IOrderPdfRenderer {
	renderOrderToPdf(orderId: number): Promise<Buffer>;
}

// ponytail: upload 1 buffer lên R2 (qua Cloudflare Worker gateway) → public URL.
export interface IR2FileService {
	uploadBuffer(buffer: Buffer, folder?: string): Promise<string>;
}

// ponytail: enqueue = ghi 1 row job (DB-outbox). Worker poll + claim row đó.
export interface IPdfQueue {
	enqueue(orderId: number): Promise<void>;
}
