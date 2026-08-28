import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { PaymentController } from './payment.controller.js';
import { container } from '../../di/container.js';

const router = Router();
const paymentCtrl = container.resolve(PaymentController);

const asyncHandler =
	(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
	(req: Request, res: Response, next: NextFunction) =>
		fn(req, res, next).catch(next);

// Không auth — PayOS server gọi trực tiếp, xác thực bằng chữ ký HMAC
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: 'Too many webhook requests' });
router.post('/payments/webhooks/payos', webhookLimiter, asyncHandler((req, res) => paymentCtrl.payosWebhook(req, res)));

export default router;
