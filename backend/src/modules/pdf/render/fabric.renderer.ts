import { injectable, inject } from 'tsyringe';
import { PDFDocument } from 'pdf-lib';
import { StaticCanvas } from 'fabric/node';
import { registerFont } from 'canvas';
import { existsSync } from 'fs';
import {isRenderableBookType} from './pdf.types.js';
import type {IOrderPdfRenderer} from './pdf.types.js';
import { OrderRepository } from '../../order-cart/repositories/order.repository.js';
import { BookRepository } from '../../product/books/books.repository.js';
import type { IBookService } from '../../product/books/books.service.js';

const GRAY_1X1 =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

const PDF_FONT_FAMILY = process.env.PDF_FONT_FAMILY || 'PDFVi';
let fontReady = false;

const EXPORT_PX_PER_MM = 300 / 25.4;
const MM_TO_PT = 2.834645669;

// thiếu → thử font hệ thống có hỗ trợ tiếng Việt (Arial Win / DejaVuSans Linux / Arial macOS).
// Variants optional — thiếu file nào thì canvas fallback về regular, không crash.
const CANDIDATE_FONT_SETS: { family: string; regular: string; bold?: string; italic?: string; boldItalic?: string }[] = [
	{
		family: 'PDFVi',
		regular: 'C:/Windows/Fonts/arial.ttf',
		bold: 'C:/Windows/Fonts/arialbd.ttf',
		italic: 'C:/Windows/Fonts/ariali.ttf',
		boldItalic: 'C:/Windows/Fonts/arialbi.ttf',
	},
	{
		family: 'PDFVi',
		regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
		bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
		italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
	},
	{
		family: 'PDFVi',
		regular: '/Library/Fonts/Arial.ttf',
		bold: '/Library/Fonts/Arial Bold.ttf',
		italic: '/Library/Fonts/Arial Italic.ttf',
		boldItalic: '/Library/Fonts/Arial Bold Italic.ttf',
	},
];

function ensureFont() {
	if (fontReady) return;
	const envPath = process.env.PDF_FONT_PATH;
	const envFamily = process.env.PDF_FONT_FAMILY;
	if (envPath && envFamily) {
		try {
			registerFont(envPath, { family: envFamily });
			fontReady = true;
			return;
		} catch {
			/* fall through to candidate fonts */
		}
	}
	for (const s of CANDIDATE_FONT_SETS) {
		if (!existsSync(s.regular)) continue;
		try {
			registerFont(s.regular, { family: s.family });
			if (s.bold && existsSync(s.bold)) registerFont(s.bold, { family: s.family, weight: 'bold' });
			if (s.italic && existsSync(s.italic)) registerFont(s.italic, { family: s.family, style: 'italic' });
			if (s.boldItalic && existsSync(s.boldItalic))
				registerFont(s.boldItalic, { family: s.family, weight: 'bold', style: 'italic' });
			fontReady = true;
			return;
		} catch {
			/* try next */
		}
	}
	fontReady = true;
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

function parseCanvasJson(canvasJson: unknown): any {
	if (canvasJson && typeof canvasJson === 'object') return canvasJson;
	if (typeof canvasJson === 'string') {
		try {
			return JSON.parse(canvasJson);
		} catch {
			return null;
		}
	}
	return null;
}

// Đệ quy qua objects lồng nhau — ảnh trong group không nằm top-level, bỏ sót là PDF mất ảnh.
function eachImageObject(json: any, fn: (o: any) => void) {
	if (Array.isArray(json?.objects)) {
		for (const o of json.objects) {
			if (String(o?.type || '').toLowerCase() === 'image') fn(o);
			if (Array.isArray((o as any)?.objects)) eachImageObject(o, fn);
		}
	}
}

function collectImageSrcs(json: any): string[] {
	const srcs: string[] = [];
	const push = (src?: string) => {
		if (typeof src === 'string' && /^https?:\/\//i.test(src)) srcs.push(src);
	};
	eachImageObject(json, (o) => push(o?.src));
	push(json?.backgroundImage?.src);
	return srcs;
}

function replaceSrc(json: any, from: string, to: string) {
	eachImageObject(json, (o) => {
		if (o?.src === from) o.src = to;
	});
	if (json?.backgroundImage?.src === from) json.backgroundImage.src = to;
}

// tải song song có giới hạn — nhanh hơn tuần tự mà không ngợp băng thông/RAM.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i]);
		}
	});
	await Promise.all(workers);
	return out;
}

@injectable()
export class FabricRenderer implements IOrderPdfRenderer {
	constructor(
		@inject('OrderRepository') private orderRepo: OrderRepository,
		@inject('BookRepository') private bookRepo: BookRepository,
		@inject('IBookService') private bookService: IBookService,
	) {}

	async renderOrderToPdf(orderId: number): Promise<Buffer> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new Error(`Order ${orderId} not found`);
		ensureFont();

		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const pdf = await PDFDocument.create();

		const bookIds = items.map((i) => i?.bookId).filter((id) => typeof id === 'number');
		// in đúng bản mới nhất: ép flush delta treo trước khi đọc content.
		await this.bookService.flushBooks(bookIds);
		const books = await this.bookRepo.findBooksByIds(bookIds);
		const byId = new Map(books.map((b: any) => [b.id, b]));
		for (const item of items) {
			const book = byId.get(item?.bookId);
			if (!book) continue;
			if (!isRenderableBookType((book as any)?.type)) continue;
			const content = book?.content as any;
			const pages: any[] = Array.isArray(content?.pages) ? content.pages : [];
			for (const page of pages) {
				const json = parseCanvasJson(page?.canvasJson);
				if (!json) continue;
				const png = await this.renderPage(json, book ?? undefined);
				const img = await pdf.embedPng(png);
				// 8-inch page out of 150mm of paper.
				const pw = (Number(book?.paperWidth) || 150) * MM_TO_PT;
				const ph = (Number(book?.paperHeight) || 150) * MM_TO_PT;
				const p = pdf.addPage([pw, ph]);
				p.drawImage(img, { x: 0, y: 0, width: pw, height: ph });
			}
		}

		const bytes = await pdf.save();
		return Buffer.from(bytes);
	}

	private async renderPage(json: any, book?: { paperWidth?: number | null; paperHeight?: number | null }): Promise<Buffer> {
		// same scale as the studio FORMATS: 150mm -> 600px). json.width wins when present.
		const mmW = Number(book?.paperWidth) || 150;
		const mmH = Number(book?.paperHeight) || 150;
		const baseW = Number(json.width) || Math.round(mmW * 4);
		const baseH = Number(json.height) || Math.round(mmH * 4);
		// bigger PDFs + slower render; the price of print-sharp output without a vector rewrite.
		const zoom = EXPORT_PX_PER_MM / 4;
		const srcs = collectImageSrcs(json);

		// Tải song song tối đa 5 ảnh/lượt. Retry vẫn từng ảnh như cũ.
		const datas = await mapLimit(srcs, 5, (src) => this.downloadOne(src));
		datas.forEach((dataUrl, i) => replaceSrc(json, srcs[i], dataUrl));

		const canvas = new StaticCanvas(undefined, { width: Math.round(baseW * zoom), height: Math.round(baseH * zoom) });
		await canvas.loadFromJSON(json);
		canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
		// Weight/style pass through from JSON — bold/italic variants registered in ensureFont.
		const family = process.env.PDF_FONT_FAMILY || PDF_FONT_FAMILY;
		for (const obj of canvas.getObjects()) {
			const t = (obj as any).type?.toLowerCase?.() ?? '';
			if (t.includes('text')) (obj as any).fontFamily = family;
		}
		canvas.renderAll();
		const dataUrl = canvas.toDataURL({ format: 'png' } as any);
		canvas.dispose();
		const b64 = dataUrl.split(',')[1] ?? '';
		return Buffer.from(b64, 'base64');
	}

	private async downloadOne(url: string, retries = 3): Promise<string> {
		for (let i = 0; i <= retries; i++) {
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`status ${res.status}`);
				const buf = Buffer.from(await res.arrayBuffer());
				const mime = res.headers.get('content-type') || 'image/png';
				return `data:${mime};base64,${buf.toString('base64')}`;
			} catch {
				if (i === retries) return GRAY_1X1;
				await sleep(300 * 2 ** i);
			}
		}
		return GRAY_1X1;
	}
}
