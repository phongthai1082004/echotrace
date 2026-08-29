import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import rateLimit from 'express-rate-limit';
import { OrderController } from './order.controller.js';
import { authGuard, AuthRequest } from '../../middleware/auth.middleware.js';
import { container } from '../../di/container.js';
import { OrderRepository } from './order.repository.js';
import { ApiResponse } from '../../middleware/api.response.js';
import type { IPdfQueue } from '../pdf/pdf.types.js';

const router = Router();
const orderCtrl = container.resolve(OrderController);
const orderRepo = container.resolve<OrderRepository>('OrderRepository');


const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many order requests' });
router.post('/orders', authGuard(), orderLimiter, asyncHandler((req, res) => orderCtrl.createOrder(req, res)));
router.get('/orders', authGuard(), asyncHandler((req, res) => orderCtrl.listMyOrders(req, res)));
router.post('/orders/:id/payment-link', authGuard(), asyncHandler((req, res) => orderCtrl.createPaymentLink(req, res)));
router.post('/orders/:id/verify', authGuard(), asyncHandler((req, res) => orderCtrl.verifyPayment(req, res)));
router.post('/orders/:id/cancel', authGuard(), asyncHandler((req, res) => orderCtrl.cancelOrder(req, res)));
router.post('/orders/:id/return', authGuard(), asyncHandler((req, res) => orderCtrl.requestReturn(req, res)));
router.post('/orders/:id/report-defect', authGuard(), asyncHandler((req, res) => orderCtrl.reportDefect(req, res)));

router.get('/admin/orders', authGuard('admin'), asyncHandler((req, res) => orderCtrl.listAllOrders(req, res)));
router.get('/admin/orders/:id', authGuard('admin'), asyncHandler((req, res) => orderCtrl.getOrderById(req, res)));
router.post('/admin/orders/:id/events', authGuard('admin'), asyncHandler((req, res) => orderCtrl.processEvent(req, res)));
router.patch('/admin/orders/:id', authGuard('admin'), asyncHandler((req, res) => orderCtrl.updateOrder(req, res)));
router.post('/admin/orders/:id/return-approve', authGuard('admin'), asyncHandler((req, res) => orderCtrl.approveReturn(req, res)));
router.post('/admin/orders/:id/return-reshipped', authGuard('admin'), asyncHandler((req, res) => orderCtrl.markReshipped(req, res)));
router.post('/admin/orders/:id/mark-defective', authGuard('admin'), asyncHandler((req, res) => orderCtrl.markDefective(req, res)));

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
