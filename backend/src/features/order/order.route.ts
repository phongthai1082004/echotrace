import { Router, Request, Response, NextFunction } from 'express';
import { OrderController } from './order.controller.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.middleware.js';
import { container } from '../../di/container.js';

const router = Router();
const orderCtrl = container.resolve(OrderController);

const asyncHandler =
	(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
	(req: Request, res: Response, next: NextFunction) =>
		fn(req as AuthRequest, res, next).catch(next);

router.post('/orders', authMiddleware, asyncHandler((req, res) => orderCtrl.createOrder(req, res)));
router.get('/orders', authMiddleware, asyncHandler((req, res) => orderCtrl.listMyOrders(req, res)));
router.post('/orders/:id/payment-link', authMiddleware, asyncHandler((req, res) => orderCtrl.createPaymentLink(req, res)));
router.post('/orders/:id/verify', authMiddleware, asyncHandler((req, res) => orderCtrl.verifyPayment(req, res)));
router.post('/orders/:id/cancel', authMiddleware, asyncHandler((req, res) => orderCtrl.cancelOrder(req, res)));
router.post('/orders/:id/return', authMiddleware, asyncHandler((req, res) => orderCtrl.requestReturn(req, res)));

router.get('/admin/orders', adminMiddleware, asyncHandler((req, res) => orderCtrl.listAllOrders(req, res)));
router.post('/admin/orders/:id/events', adminMiddleware, asyncHandler((req, res) => orderCtrl.processEvent(req, res)));
router.patch('/admin/orders/:id', adminMiddleware, asyncHandler((req, res) => orderCtrl.updateOrder(req, res)));
router.post('/admin/orders/:id/return-approve', adminMiddleware, asyncHandler((req, res) => orderCtrl.approveReturn(req, res)));
router.post('/admin/orders/:id/return-reshipped', adminMiddleware, asyncHandler((req, res) => orderCtrl.markReshipped(req, res)));

export default router;
