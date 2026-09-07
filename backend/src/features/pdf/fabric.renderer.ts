import { injectable, inject } from 'tsyringe';
import { PDFDocument } from 'pdf-lib';
import { StaticCanvas } from 'fabric/node';
import { registerFont } from 'canvas';
import { existsSync } from 'fs';
import { IOrderPdfRenderer, isRenderableBookType } from './pdf.types.js';
import { OrderRepository } from '../order/order.repository.js';
import { BookRepository } from '../books/books.repository.js';

// ponytail: 1x1 gray placeholder — fallback khi ảnh fail hết retry (PDF vẫn ra, không đổ vỡ).
const GRAY_1X1 =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

const PDF_FONT_FAMILY = process.env.PDF_FONT_FAMILY || 'PDFVi';
let fontReady = false;

// ponytail: tiếng Việt cần font có glyph dấu. Ưu tiên PDF_FONT_PATH env;
// thiếu → thử font hệ thống có hỗ trợ tiếng Việt (Arial Win / DejaVuSans Linux / Arial macOS).
const CANDIDATE_FONTS: { path: string; family: string }[] = [
	{ path: 'C:/Windows/Fonts/arial.ttf', family: 'PDFVi' },
	{ path: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', family: 'PDFVi' },
	{ path: '/Library/Fonts/Arial.ttf', family: 'PDFVi' },
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
	for (const c of CANDIDATE_FONTS) {
		if (existsSync(c.path)) {
			try {
				registerFont(c.path, { family: c.family });
				fontReady = true;
				return;
			} catch {
				/* try next */
			}
		}
	}
	// ponytail: không có font tiếng Việt → node-canvas dùng fallback mặc định (dấu có thể vỡ).
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

// ponytail: chỉ lấy src http(s) của image object (và background) để tải.
function collectImageSrcs(json: any): string[] {
	const srcs: string[] = [];
	const push = (src?: string) => {
		if (typeof src === 'string' && /^https?:\/\//i.test(src)) srcs.push(src);
	};
	if (Array.isArray(json?.objects)) for (const o of json.objects) push(o?.src);
	push(json?.backgroundImage?.src);
	return srcs;
}

function replaceSrc(json: any, from: string, to: string) {
	if (Array.isArray(json?.objects)) for (const o of json.objects) if (o?.src === from) o.src = to;
	if (json?.backgroundImage?.src === from) json.backgroundImage.src = to;
}

@injectable()
export class FabricRenderer implements IOrderPdfRenderer {
	constructor(
		@inject('OrderRepository') private orderRepo: OrderRepository,
		@inject('BookRepository') private bookRepo: BookRepository,
	) {}

	async renderOrderToPdf(orderId: number): Promise<Buffer> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new Error(`Order ${orderId} not found`);
		ensureFont();

		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const pdf = await PDFDocument.create();

		for (const item of items) {
			const bookId = item?.bookId;
			if (!bookId) continue;
			const book = await this.bookRepo.findBookById(bookId);
			// ponytail: chỉ render book không phải ALBUM (theo SampleBook.type).
			if (!isRenderableBookType(book?.type)) continue;
			const content = book?.content as any;
			const pages: any[] = Array.isArray(content?.pages) ? content.pages : [];
			for (const page of pages) {
				const json = parseCanvasJson(page?.canvasJson);
				if (!json) continue;
				const png = await this.renderPage(json, book);
				const img = await pdf.embedPng(png);
				// ponytail: mỗi trang fabric = 1 trang PDF, kích thước = canvas.
				const p = pdf.addPage([img.width, img.height]);
				p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
			}
		}

		const bytes = await pdf.save();
		return Buffer.from(bytes);
	}

	// ponytail: render 1 trang fabric JSON → PNG buffer.
	private async renderPage(json: any, book?: { paperWidth?: number | null; paperHeight?: number | null }): Promise<Buffer> {
		// ponytail: old saves have no width/height -> derive page px from book paper (4 px/mm,
		// same scale as the studio FORMATS: 150mm -> 600px). json.width wins when present.
		const mmW = Number(book?.paperWidth) || 150;
		const mmH = Number(book?.paperHeight) || 150;
		const width = Number(json.width) || Math.round(mmW * 4);
		const height = Number(json.height) || Math.round(mmH * 4);
		const srcs = collectImageSrcs(json);

		// TẢI TỪNG ẢNH 1 (sequential) — không ngợp băng thông. Retry chỉ ảnh đó.
		for (const src of srcs) {
			const dataUrl = await this.downloadOne(src);
			replaceSrc(json, src, dataUrl);
		}

		const canvas = new StaticCanvas(undefined, { width, height });
		await canvas.loadFromJSON(json);
		// ponytail: ép font có dấu tiếng Việt cho mọi text object (fix font tiếng việt).
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

	// ponytail: tải 1 ảnh, retry 3 lần (backoff x2). Fail → placeholder, tiếp tục.
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
