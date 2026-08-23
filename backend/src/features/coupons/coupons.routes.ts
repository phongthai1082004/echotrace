import { container } from 'tsyringe';
import { Router, Request, Response, NextFunction } from 'express';
import { CouponController } from './coupons.controller.js';
import { adminMiddleware, AuthRequest } from '../../middleware/auth.middleware.js';
import { validateDto } from '../../middleware/validator.middleware.js';
import { CreateCouponDTO } from '../../dto/coupon/coupon.create.dto.js';

const router = Router();
const couponCtrl = container.resolve(CouponController);

const asyncHandler =
	(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
		fn(req as AuthRequest, res, next).catch(next);

router.get(
	'/admin/coupons',
	adminMiddleware,
	asyncHandler((req, res) => couponCtrl.list(req, res)),
);
router.post(
	'/admin/coupons',
	adminMiddleware,
	validateDto(CreateCouponDTO),
	asyncHandler((req, res) => couponCtrl.create(req, res)),
);
router.delete(
	'/admin/coupons/:id',
	adminMiddleware,
	asyncHandler((req, res) => couponCtrl.remove(req, res)),
);
router.patch(
	'/admin/coupons/:id/deactivate',
	adminMiddleware,
	asyncHandler((req, res) => couponCtrl.deactivate(req, res)),
);

export default router;
