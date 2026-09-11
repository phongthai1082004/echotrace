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

// ponytail: export raster at 300 DPI, not the 4px/mm (~101 DPI) edit scale.
const EXPORT_PX_PER_MM = 300 / 25.4;
const MM_TO_PT = 2.834645669;

// ponytail: tiếng Việt cần font có glyph dấu. Ưu tiên PDF_FONT_PATH env;
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
// Đệ quy qua objects lồng nhau — ảnh trong group không nằm top-level, bỏ sót là PDF mất ảnh.
function eachImageObject(json: any, fn: (o: any) => void) {
	if (Array.isArray(json?.objects)) {
		for (const o of json.objects) {
			// ponytail: saved JSON uses capitalized types ("Image"), live objects lowercase.
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
				const png = await this.renderPage(json, book ?? undefined);
				const img = await pdf.embedPng(png);
				// ponytail: page size must be real mm→pt, not raster px — px-as-pt made an
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

	// ponytail: render 1 trang fabric JSON → PNG buffer.
	private async renderPage(json: any, book?: { paperWidth?: number | null; paperHeight?: number | null }): Promise<Buffer> {
		// ponytail: old saves have no width/height -> derive base px from book paper (4 px/mm,
		// same scale as the studio FORMATS: 150mm -> 600px). json.width wins when present.
		const mmW = Number(book?.paperWidth) || 150;
		const mmH = Number(book?.paperHeight) || 150;
		const baseW = Number(json.width) || Math.round(mmW * 4);
		const baseH = Number(json.height) || Math.round(mmH * 4);
		// ponytail: load at base size, then zoom the viewport to 300 DPI. Bigger PNGs =
		// bigger PDFs + slower render; the price of print-sharp output without a vector rewrite.
		const zoom = EXPORT_PX_PER_MM / 4;
		const srcs = collectImageSrcs(json);

		// TẢI TỪNG ẢNH 1 (sequential) — không ngợp băng thông. Retry chỉ ảnh đó.
		for (const src of srcs) {
			const dataUrl = await this.downloadOne(src);
			replaceSrc(json, src, dataUrl);
		}

		const canvas = new StaticCanvas(undefined, { width: Math.round(baseW * zoom), height: Math.round(baseH * zoom) });
		await canvas.loadFromJSON(json);
		canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
		// ponytail: ép font có dấu tiếng Việt cho mọi text object (fix font tiếng việt).
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
