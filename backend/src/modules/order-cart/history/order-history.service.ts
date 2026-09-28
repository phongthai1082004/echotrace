import { inject, injectable } from 'tsyringe';
import { OrderRepository } from '../repositories/order.repository.js';
import type { IPdfQueue } from '../../pdf/render/pdf.types.js';
import { getGaTrafficBySource } from '../../../shared/ga/ga-data.service.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

export interface IOrderHistoryService {
	listMyOrders(userId: number, query?: { cursor?: number; take?: number }): Promise<{ items: any[]; nextCursor: number | null }>;
	listAllOrders(): Promise<any[]>;
	getOrderById(id: number): Promise<any>;
	queueOrderPdf(orderId: number, userId?: number): Promise<void>;
	getMarketingSummary(days: number): Promise<Record<string, unknown>>;
}

@injectable()
export class OrderHistoryService implements IOrderHistoryService {
	constructor(
		@inject('OrderRepository') private orderRepo: OrderRepository,
		@inject('IPdfQueue') private pdfQueue: IPdfQueue,
	) {}

	async listMyOrders(userId: number, query?: { cursor?: number; take?: number }): Promise<{ items: any[]; nextCursor: number | null }> {
		return this.orderRepo.listMyOrders(userId, query);
	}

	async listAllOrders(): Promise<any[]> {
		return this.orderRepo.listAllOrders();
	}

	async getOrderById(id: number): Promise<any> {
		return this.orderRepo.getOrderById(id);
	}

	async queueOrderPdf(orderId: number, userId?: number): Promise<void> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (userId !== undefined && order.userId !== userId) throw new AppError(ErrorCode.ORDER_FORBIDDEN, 403);
		await this.pdfQueue.enqueue(orderId);
	}

	async getMarketingSummary(days: number): Promise<Record<string, unknown>> {
		const span = Math.min(Math.max(Math.floor(days) || 30, 1), 365);
		const to = new Date();
		const from = new Date(to.getTime() - span * 864e5);
		const [orderRows, bookRows, gaRows] = await Promise.all([
			this.orderRepo.summarizeOrdersBySource(from, to),
			this.orderRepo.countBooksBySource(from, to),
			getGaTrafficBySource(span),
		]);
		const bySource: Record<string, { source: string; visitors: number; opened: number; preview: number; checkout: number; orders: number; revenue: number; books: number }> = {};
		const blank = (source: string) => ({ source, visitors: 0, opened: 0, preview: 0, checkout: 0, orders: 0, revenue: 0, books: 0 });
		for (const r of gaRows ?? []) {
			bySource[r.source] = { ...blank(r.source), visitors: r.visitors, opened: r.opened, preview: r.preview, checkout: r.checkout };
		}
		for (const r of orderRows) {
			const key = r.utmSource || 'unknown';
			bySource[key] = bySource[key] ?? blank(key);
			bySource[key].orders = r._count._all;
			bySource[key].revenue = Math.round((r._sum.paidAmount ?? 0) * 100) / 100;
		}
		for (const r of bookRows) {
			const key = r.utmSource || 'unknown';
			bySource[key] = bySource[key] ?? blank(key);
			bySource[key].books = r._count._all;
		}
		const rows = Object.values(bySource);
		const orders = rows.reduce((s, r) => s + r.orders, 0);
		const revenue = Math.round(rows.reduce((s, r) => s + r.revenue, 0) * 100) / 100;
		const visitors = rows.reduce((s, r) => s + r.visitors, 0);
		return {
			from: from.toISOString(),
			to: to.toISOString(),
			gaConfigured: gaRows !== null,
			totals: {
				orders,
				revenue,
				avgOrderValue: orders ? Math.round((revenue / orders) * 100) / 100 : 0,
				books: rows.reduce((s, r) => s + r.books, 0),
				visitors,
				opened: rows.reduce((s, r) => s + r.opened, 0),
				preview: rows.reduce((s, r) => s + r.preview, 0),
				checkout: rows.reduce((s, r) => s + r.checkout, 0),
			},
			bySource: rows.sort((a, b) => b.visitors - a.visitors || b.orders - a.orders),
		};
	}
}
