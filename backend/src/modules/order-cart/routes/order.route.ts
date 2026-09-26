import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { validateDto } from '../../../shared/middleware/validator.middleware.js';
import { RequestReturnDTO, UpdateOrderDTO, AlbumOrderDTO, ProcessEventDTO } from '@echotrace/shared';
import rateLimit from 'express-rate-limit';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { LifecycleController } from '../controllers/lifecycle.controller.js';
import { ReturnsController } from '../controllers/returns.controller.js';
import { HistoryController } from '../controllers/history.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { container } from '../../../di/container.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { getGaTrafficBySource } from '../../../shared/ga/ga-data.service.js';
import type { IPdfQueue } from '../../pdf/render/pdf.types.js';

const router = Router();
const checkoutCtrl = container.resolve(CheckoutController);
const lifecycleCtrl = container.resolve(LifecycleController);
const returnsCtrl = container.resolve(ReturnsController);
const historyCtrl = container.resolve(HistoryController);
const orderRepo = container.resolve<OrderRepository>('OrderRepository');


const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many order requests' });
router.post('/orders', authGuard(), orderLimiter, asyncHandler((req, res) => checkoutCtrl.createOrder(req, res)));
router.get('/orders', authGuard(), asyncHandler((req, res) => historyCtrl.listMyOrders(req, res)));
router.get('/config/webhook', asyncHandler((req, res) => lifecycleCtrl.getWebhookConfig(req, res)));
router.post('/orders/:id/payment-link', authGuard(), asyncHandler((req, res) => lifecycleCtrl.createPaymentLink(req, res)));
router.post('/orders/:id/verify', authGuard(), asyncHandler((req, res) => lifecycleCtrl.verifyPayment(req, res)));
router.post('/orders/:id/cancel', authGuard(), asyncHandler((req, res) => lifecycleCtrl.cancelOrder(req, res)));
router.post('/orders/:id/return', authGuard(), validateDto(RequestReturnDTO), asyncHandler((req, res) => returnsCtrl.requestReturn(req, res)));
router.post('/orders/:id/report-defect', authGuard(), asyncHandler((req, res) => returnsCtrl.reportDefect(req, res)));

router.post('/admin/orders/album', authGuard('admin'), validateDto(AlbumOrderDTO), asyncHandler((req, res) => checkoutCtrl.createAlbumOrder(req, res)));
router.get('/admin/orders', authGuard('admin'), asyncHandler((req, res) => historyCtrl.listAllOrders(req, res)));
router.get('/admin/orders/:id', authGuard('admin'), asyncHandler((req, res) => historyCtrl.getOrderById(req, res)));
router.post('/admin/orders/:id/events', authGuard('admin'), validateDto(ProcessEventDTO), asyncHandler((req, res) => lifecycleCtrl.processEvent(req, res)));
router.patch('/admin/orders/:id', authGuard('admin'), validateDto(UpdateOrderDTO), asyncHandler((req, res) => lifecycleCtrl.updateOrder(req, res)));
router.post('/admin/orders/:id/return-approve', authGuard('admin'), asyncHandler((req, res) => returnsCtrl.approveReturn(req, res)));
router.post('/admin/orders/:id/return-reshipped', authGuard('admin'), asyncHandler((req, res) => returnsCtrl.markReshipped(req, res)));
router.post('/admin/orders/:id/mark-defective', authGuard('admin'), asyncHandler((req, res) => returnsCtrl.markDefective(req, res)));

router.post('/orders/:id/pdf', authGuard(), asyncHandler(async (req, res) => {
	const orderId = Number(req.params.id);
	const order = await orderRepo.findOrderById(orderId);
	if (!order) {
		res.status(404).json(ApiResponse.error('Order not found', 404));
		return;
	}
	if (order.userId !== Number(req.userId)) {
		res.status(403).json(ApiResponse.error('Forbidden', 403));
		return;
	}
	await container.resolve<IPdfQueue>('IPdfQueue').enqueue(orderId);
	res.json(ApiResponse.success({ queued: true }));
}));

router.post('/admin/orders/:id/pdf', authGuard('admin'), asyncHandler(async (req, res) => {
	const orderId = Number(req.params.id);
	const order = await orderRepo.findOrderById(orderId);
	if (!order) {
		res.status(404).json(ApiResponse.error('Order not found', 404));
		return;
	}
	await container.resolve<IPdfQueue>('IPdfQueue').enqueue(orderId);
	res.json(ApiResponse.success({ queued: true }));
}));

// (visitors/events theo sessionSource). Chưa cấu hình GA → gaConfigured=false.
router.get('/admin/marketing/summary', authGuard('admin'), asyncHandler(async (req, res) => {
	const days = Math.min(Math.max(parseInt(String(req.query.days ?? '30')) || 30, 1), 365);
	const to = new Date();
	const from = new Date(to.getTime() - days * 864e5);
	const [orderRows, bookRows, gaRows] = await Promise.all([
		orderRepo.summarizeOrdersBySource(from, to),
		orderRepo.countBooksBySource(from, to),
		getGaTrafficBySource(days),
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
	res.json(ApiResponse.success({
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
	}));
}));

export default router;
