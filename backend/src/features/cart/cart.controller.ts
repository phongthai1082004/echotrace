import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { ICartService } from './cart.service.js';
import { ApiResponse } from '../../middleware/api.response.js';

@injectable()
export class CartController {
	constructor(@inject('ICartService') private readonly cartService: ICartService) {}

	getCart = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const cart = await this.cartService.getCart(userId);
		res.json(ApiResponse.success(cart));
	};

	updateCart = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const { items: rawItems } = req.body;
		let items = rawItems;
		if (typeof rawItems === 'string' && rawItems) {
			try {
				items = JSON.parse(rawItems);
			} catch {}
		}
		const cart = await this.cartService.updateCart(userId, { items });
		res.json(ApiResponse.success(cart));
	};

	calculateCart = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const { paymentMethod, couponCode } = req.body ?? {};
		const quote = await this.cartService.calculateCart(userId, paymentMethod ?? null, couponCode ?? null);
		res.json(ApiResponse.success(quote));
	};
}
