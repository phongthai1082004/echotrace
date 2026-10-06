import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {ICheckoutService} from '../checkout/checkout.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@injectable()
export class CheckoutController {
	constructor(@inject('ICheckoutService') private readonly checkoutService: ICheckoutService) {}

	createOrder = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const idempotencyKey = req.header('Idempotency-Key');
		if (!idempotencyKey || !UUID_RE.test(idempotencyKey)) {
			res.status(400).json(ApiResponse.error('Idempotency-Key (UUID) is required', 400));
			return;
		}
		const result = await this.checkoutService.createOrder(idempotencyKey, JSON.stringify(req.body ?? {}), userId);
		res.json(ApiResponse.success(result));
	};

	createAlbumOrder = async (req: AuthRequest, res: Response) => {
		const b = req.body ?? {};
		const customerId = Number(b.customerId);
		const sampleBookId = Number(b.sampleBookId);
		if (!Number.isInteger(customerId) || !Number.isInteger(sampleBookId)) {
			throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { customerId: ['must be integer ids'] });
		}
		const result = await this.checkoutService.createAlbumOrder({
			customerId,
			sampleBookId,
			quantity: b.quantity ?? 1,
			cover: b.cover ?? null,
			paper: b.paper ?? null,
			name: b.name,
			phone: b.phone,
			address: b.address,
			city: b.city,
			note: b.note,
			paymentMethod: b.paymentMethod,
			couponCode: b.couponCode ?? null,
			utmSource: b.utmSource,
			utmMedium: b.utmMedium,
			utmCampaign: b.utmCampaign,
		});
		res.json(ApiResponse.success(result));
	};
}
