/**
 * Part 4 remainder — PDF render edge cases (FabricRenderer).
 * New file (not pdf-worker.test.ts): that file covers the PdfWorker poll loop,
 * a different module. Base = current fabric.renderer.ts behavior:
 * - no Vietnamese font available → node-canvas fallback, render continues
 * - every image download fails → gray 1x1 placeholder, PDF still produced
 * - corrupt page canvasJson → page skipped, sibling pages still render
 */
import { mock } from "jest-mock-extended";
import { PDFDocument } from "pdf-lib";
import { FabricRenderer } from "../../../src/modules/pdf/render/fabric.renderer.js";
import type { OrderRepository } from "../../../src/modules/order-cart/repositories/order.repository.js";
import type { BookRepository } from "../../../src/modules/product/books/books.repository.js";
import type { IBookService } from "../../../src/modules/product/books/books.service.js";

const blankPage = () => ({
	canvasJson: { version: "7.0", width: 600, height: 600, objects: [], background: "#ffffff" },
});

const bookOf = (pages: any[], over: Record<string, any> = {}) => ({
	id: 1,
	type: "TEMPLATE",
	paperWidth: 150,
	paperHeight: 150,
	content: { pages },
	...over,
});

const rendererWith = (pages: any[], bookOver: Record<string, any> = {}) => {
	const orderRepo = mock<OrderRepository>();
	const bookRepo = mock<BookRepository>();
	const books = mock<IBookService>();
	books.flushBooks.mockResolvedValue({ flushed: 0 });
	orderRepo.findOrderById.mockResolvedValue({ id: 9, orderItems: [{ bookId: 1 }] } as any);
	bookRepo.findBookById.mockResolvedValue(bookOf(pages, bookOver) as any);
	bookRepo.findBooksByIds.mockResolvedValue([bookOf(pages, bookOver)] as any);
	return new FabricRenderer(orderRepo, bookRepo, books);
};

const pdfHeader = (buf: Buffer) => buf.subarray(0, 5).toString();

describe("pdf render edge cases", () => {
	it("missing Vietnamese font (bogus PDF_FONT_PATH) → falls back without crashing", async () => {
		process.env.PDF_FONT_PATH = "/nonexistent/font.ttf";
		process.env.PDF_FONT_FAMILY = "MissingFam";
		try {
			const page = {
				canvasJson: {
					version: "7.0",
					width: 600,
					height: 600,
					objects: [{ type: "textbox", text: "Tiếng Việt có dấu", left: 50, top: 50, width: 400, fontSize: 32 }],
					background: "#ffffff",
				},
			};
			const buf = await rendererWith([page]).renderOrderToPdf(9);
			expect(pdfHeader(buf)).toBe("%PDF-");
			expect((await PDFDocument.load(buf)).getPageCount()).toBe(1);
		} finally {
			delete process.env.PDF_FONT_PATH;
			delete process.env.PDF_FONT_FAMILY;
		}
	});

	it("all images fail → gray placeholder, PDF still renders", async () => {
		const fetchMock = jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("net down"));
		try {
			const page = {
				canvasJson: {
					version: "7.0",
					width: 600,
					height: 600,
					objects: [{ type: "image", src: "https://cdn/x.png", left: 0, top: 0, width: 100, height: 100 }],
					background: "#ffffff",
				},
			};
			const buf = await rendererWith([page]).renderOrderToPdf(9);
			expect(fetchMock).toHaveBeenCalledWith("https://cdn/x.png");
			expect(pdfHeader(buf)).toBe("%PDF-");
			expect((await PDFDocument.load(buf)).getPageCount()).toBe(1);
		} finally {
			fetchMock.mockRestore();
		}
	}, 20000);

	it("corrupt canvasJson → page skipped, sibling pages still render", async () => {
		const buf = await rendererWith([{ canvasJson: "{oops" }, blankPage()]).renderOrderToPdf(9);
		expect(pdfHeader(buf)).toBe("%PDF-");
		expect((await PDFDocument.load(buf)).getPageCount()).toBe(1);
	});

	it("ALBUM book → skipped entirely (no image downloads, no content pages)", async () => {
		const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x"));
		try {
			const page = {
				canvasJson: {
					version: "7.0",
					width: 600,
					height: 600,
					objects: [{ type: "image", src: "https://cdn/x.png", left: 0, top: 0, width: 100, height: 100 }],
					background: "#ffffff",
				},
			};
			const buf = await rendererWith([page], { type: "ALBUM" }).renderOrderToPdf(9);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(pdfHeader(buf)).toBe("%PDF-");
			// base note: pdf-lib save() on a doc with zero added pages emits 1 blank page.
			expect((await PDFDocument.load(buf)).getPageCount()).toBe(1);
		} finally {
			fetchMock.mockRestore();
		}
	});
});
