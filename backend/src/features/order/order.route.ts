import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { OrderController } from './order.controller.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.middleware.js';
import { container } from '../../di/container.js';

const router = Router();
const orderCtrl = container.resolve(OrderController);

const asyncHandler =
	(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
	(req: Request, res: Response, next: NextFunction) =>
		fn(req as AuthRequest, res, next).catch(next);

const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many order requests' });
router.post('/orders', authMiddleware, orderLimiter, asyncHandler((req, res) => orderCtrl.createOrder(req, res)));
router.get('/orders', authMiddleware, asyncHandler((req, res) => orderCtrl.listMyOrders(req, res)));
router.post('/orders/:id/payment-link', authMiddleware, asyncHandler((req, res) => orderCtrl.createPaymentLink(req, res)));
router.post('/orders/:id/verify', authMiddleware, asyncHandler((req, res) => orderCtrl.verifyPayment(req, res)));
router.post('/orders/:id/cancel', authMiddleware, asyncHandler((req, res) => orderCtrl.cancelOrder(req, res)));
router.post('/orders/:id/return', authMiddleware, asyncHandler((req, res) => orderCtrl.requestReturn(req, res)));
router.post('/orders/:id/report-defect', authMiddleware, asyncHandler((req, res) => orderCtrl.reportDefect(req, res)));

router.get('/admin/orders', adminMiddleware, asyncHandler((req, res) => orderCtrl.listAllOrders(req, res)));
router.get('/admin/orders/:id', adminMiddleware, asyncHandler((req, res) => orderCtrl.getOrderById(req, res)));
router.post('/admin/orders/:id/events', adminMiddleware, asyncHandler((req, res) => orderCtrl.processEvent(req, res)));
router.patch('/admin/orders/:id', adminMiddleware, asyncHandler((req, res) => orderCtrl.updateOrder(req, res)));
router.post('/admin/orders/:id/return-approve', adminMiddleware, asyncHandler((req, res) => orderCtrl.approveReturn(req, res)));
router.post('/admin/orders/:id/return-reshipped', adminMiddleware, asyncHandler((req, res) => orderCtrl.markReshipped(req, res)));
router.post('/admin/orders/:id/mark-defective', adminMiddleware, asyncHandler((req, res) => orderCtrl.markDefective(req, res)));

export default router;
