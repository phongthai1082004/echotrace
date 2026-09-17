import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {ICartService} from './cart.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';

@injectable()
export class CartController {
	constructor(@inject('ICartService') private readonly cartService: ICartService) {}

	getCart = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const cart = await this.cartService.getCart(userId);
		res.json(ApiResponse.success(cart));
	};

	addItem = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		let input = req.body ?? {};
		if (typeof input === 'string') {
			try {
				input = JSON.parse(input);
			} catch {}
		}
		if (!input || typeof input.bookId !== 'number') {
			res.status(400).json(ApiResponse.error('bookId is required', 400));
			return;
		}
		const { bookId, quantity, cover, paper, paperSize } = input;
		const item = await this.cartService.upsertItem(userId, { bookId, quantity, cover, paper, paperSize });
		res.json(ApiResponse.success({ item }));
	};

	patchItem = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const bookId = parseInt(String(req.params.bookId));
		if (!Number.isFinite(bookId)) {
			res.status(400).json(ApiResponse.error('invalid bookId', 400));
			return;
		}
		const { quantity, cover, paper, paperSize } = req.body ?? {};
		const patch: Record<string, unknown> = {};
		if (quantity !== undefined) patch.quantity = Math.max(1, parseInt(quantity) || 1);
		if (cover !== undefined) patch.cover = cover;
		if (paper !== undefined) patch.paper = paper;
		if (paperSize !== undefined) patch.paperSize = paperSize;
		const item = await this.cartService.patchItem(userId, bookId, patch as any);
		res.json(ApiResponse.success({ item }));
	};

	deleteItem = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const bookId = parseInt(String(req.params.bookId));
		if (!Number.isFinite(bookId)) {
			res.status(400).json(ApiResponse.error('invalid bookId', 400));
			return;
		}
		await this.cartService.deleteItem(userId, bookId);
		res.json(ApiResponse.success({ ok: true }));
	};

	calculateCart = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const { paymentMethod, couponCode, bookIds } = req.body ?? {};
		const ids =
			Array.isArray(bookIds) && bookIds.every((id: unknown) => Number.isFinite(Number(id)))
				? (bookIds as unknown[]).map(Number)
				: null;
		const quote = await this.cartService.calculateCart(userId, paymentMethod ?? null, couponCode ?? null, ids);
		res.json(ApiResponse.success(quote));
	};

	addAlbum = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		let input = req.body ?? {};
		if (typeof input === 'string') {
			try {
				input = JSON.parse(input);
			} catch {}
		}
		const sampleBookId = Number(input?.sampleBookId);
		const quantity = Number(input?.quantity);
		if (!Number.isFinite(sampleBookId)) {
			res.status(400).json(ApiResponse.error('sampleBookId is required', 400));
			return;
		}
		const item = await this.cartService.addAlbumToCart(userId, {
			sampleBookId,
			quantity: Number.isFinite(quantity) ? quantity : 1,
		});
		res.json(ApiResponse.success({ item }));
	};
}
