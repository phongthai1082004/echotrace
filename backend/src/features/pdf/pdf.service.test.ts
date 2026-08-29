import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRenderableBookType } from './pdf.types.js';
import { PdfService } from './pdf.service.js';
import { PdfRepository } from './pdf.repository.js';

vi.mock('../../../lib/prisma.js', () => {
	const prisma = {
		order: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
		book: { findMany: vi.fn() },
		$transaction: vi.fn(async (arg: any) => {
			if (typeof arg === 'function') return arg(prisma);
			return [];
		}),
		orderPdfJob: { update: vi.fn(async () => ({})) },
	};
	return { prisma, default: prisma };
});

import { prisma } from '../../../lib/prisma.js';

describe('isRenderableBookType', () => {
	it('renders template / travel / unknown types', () => {
		expect(isRenderableBookType('TEMPLATE')).toBe(true);
		expect(isRenderableBookType('TRAVEL')).toBe(true);
		expect(isRenderableBookType(null)).toBe(true);
		expect(isRenderableBookType(undefined)).toBe(true);
	});
	it('skips ALBUM', () => {
		expect(isRenderableBookType('ALBUM')).toBe(false);
		expect(isRenderableBookType('album')).toBe(false);
	});
});

describe('PdfService.process', () => {
	beforeEach(() => vi.clearAllMocks());

	it('sets pdfUrl only on renderable (non-ALBUM) items and marks job DONE', async () => {
		const renderer = { renderOrderToPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')) };
		const r2 = { uploadBuffer: vi.fn().mockResolvedValue('https://r2/order1.pdf') };
		const svc = new PdfService(renderer as any, r2 as any, new PdfRepository({ db: prisma } as any));

		(prisma.order.findUnique as any).mockResolvedValue({
			orderItems: [
				{ bookId: 1, title: 'T', pdfUrl: null },
				{ bookId: 2, title: 'A', pdfUrl: null },
			],
		});
		(prisma.book.findMany as any).mockResolvedValue([
			{ id: 1, type: 'TEMPLATE' },
			{ id: 2, type: 'ALBUM' },
		]);

		let orderData: any;
		(prisma.order.update as any) = vi.fn(async (args: any) => {
			orderData = args.data;
			return {};
		});
		let jobData: any;
		(prisma.orderPdfJob.update as any) = vi.fn(async (args: any) => {
			jobData = args.data;
			return {};
		});

		await svc.process(10, 1);

		expect(renderer.renderOrderToPdf).toHaveBeenCalledWith(1);
		expect(r2.uploadBuffer).toHaveBeenCalled();
		expect(orderData.pdfUrl).toBe('https://r2/order1.pdf');
		expect(orderData.orderItems[0].pdfUrl).toBe('https://r2/order1.pdf');
		// ponytail: album item không được gán pdfUrl
		expect(orderData.orderItems[1].pdfUrl).toBeNull();
		expect(jobData.status).toBe('DONE');
		expect(jobData.pdfUrl).toBe('https://r2/order1.pdf');
	});

	it('handles empty order items', async () => {
		const renderer = { renderOrderToPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')) };
		const r2 = { uploadBuffer: vi.fn().mockResolvedValue('u') };
		const svc = new PdfService(renderer as any, r2 as any, new PdfRepository({ db: prisma } as any));
		(prisma.order.findUnique as any).mockResolvedValue({ orderItems: [] });
		(prisma.book.findMany as any).mockResolvedValue([]);
		let orderData: any;
		(prisma.order.update as any) = vi.fn(async (args: any) => {
			orderData = args.data;
			return {};
		});
		let jobData: any;
		(prisma.orderPdfJob.update as any) = vi.fn(async (args: any) => {
			jobData = args.data;
			return {};
		});

		await svc.process(5, 9);
		expect(orderData.pdfUrl).toBe('u');
		expect(jobData.status).toBe('DONE');
	});
});
