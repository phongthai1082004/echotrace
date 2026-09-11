import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { CouponController } from './coupons.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { validateDto } from '../../../shared/middleware/validator.middleware.js';
import { CreateCouponDTO } from '@echotrace/shared';

const router = Router();
const couponCtrl = container.resolve(CouponController);


router.get(
	'/admin/coupons',
	authGuard('admin'),
	asyncHandler((req, res) => couponCtrl.list(req, res)),
);
router.post(
	'/admin/coupons',
	authGuard('admin'),
	validateDto(CreateCouponDTO),
	asyncHandler((req, res) => couponCtrl.create(req, res)),
);
router.delete(
	'/admin/coupons/:id',
	authGuard('admin'),
	asyncHandler((req, res) => couponCtrl.remove(req, res)),
);
router.patch(
	'/admin/coupons/:id/deactivate',
	authGuard('admin'),
	asyncHandler((req, res) => couponCtrl.deactivate(req, res)),
);

export default router;
