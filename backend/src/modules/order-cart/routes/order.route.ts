import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import rateLimit from 'express-rate-limit';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { LifecycleController } from '../controllers/lifecycle.controller.js';
import { ReturnsController } from '../controllers/returns.controller.js';
import { HistoryController } from '../controllers/history.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { container } from '../../../di/container.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
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
router.post('/orders/:id/return', authGuard(), asyncHandler((req, res) => returnsCtrl.requestReturn(req, res)));
router.post('/orders/:id/report-defect', authGuard(), asyncHandler((req, res) => returnsCtrl.reportDefect(req, res)));

router.post('/admin/orders/album', authGuard('admin'), asyncHandler((req, res) => checkoutCtrl.createAlbumOrder(req, res)));
router.get('/admin/orders', authGuard('admin'), asyncHandler((req, res) => historyCtrl.listAllOrders(req, res)));
router.get('/admin/orders/:id', authGuard('admin'), asyncHandler((req, res) => historyCtrl.getOrderById(req, res)));
router.post('/admin/orders/:id/events', authGuard('admin'), asyncHandler((req, res) => lifecycleCtrl.processEvent(req, res)));
router.patch('/admin/orders/:id', authGuard('admin'), asyncHandler((req, res) => lifecycleCtrl.updateOrder(req, res)));
router.post('/admin/orders/:id/return-approve', authGuard('admin'), asyncHandler((req, res) => returnsCtrl.approveReturn(req, res)));
router.post('/admin/orders/:id/return-reshipped', authGuard('admin'), asyncHandler((req, res) => returnsCtrl.markReshipped(req, res)));
router.post('/admin/orders/:id/mark-defective', authGuard('admin'), asyncHandler((req, res) => returnsCtrl.markDefective(req, res)));

// ponytail: admin hoặc chủ đơn có thể đẩy đơn vào queue sinh PDF lại (khi item chưa có pdfUrl).
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

export default router;
