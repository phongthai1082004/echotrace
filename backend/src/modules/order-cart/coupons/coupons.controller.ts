import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { ICouponService } from './coupons.service.js';

@injectable()
export class CouponController {
	constructor(@inject('ICouponService') private readonly service: ICouponService) {}

	list = async (req: AuthRequest, res: Response) => {
		const coupons = await this.service.list();
		res.json(ApiResponse.success(coupons));
	};

	create = async (req: AuthRequest, res: Response) => {
		const { code, discountType, discountValue, minOrderAmount, minOrderType, maxDiscountAmount, maxUsageCount, isActive, expiresAt } = req.body;
		const coupon = await this.service.create({
			code,
			discountType,
			discountValue,
			minOrderAmount,
			minOrderType,
			maxDiscountAmount,
			maxUsageCount,
			isActive,
			expiresAt,
		});
		res.status(201).json(ApiResponse.success(coupon));
	};

	deactivate = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		await this.service.deactivate(id);
		res.json(ApiResponse.message('Coupon deactivated'));
	};

	remove = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		await this.service.remove(id);
		res.json(ApiResponse.message('Coupon deleted'));
	};
}
