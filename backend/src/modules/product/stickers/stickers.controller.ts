import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { AssetCategory } from '@echotrace/shared';
import { IR2ImageService } from '../../../shared/r2/r2.service.js';
import { DecorAssetRepository } from './stickers.repository.js';

const VALID_CATEGORIES = new Set(Object.values(AssetCategory));

@injectable()
export class StickerController {
	constructor(
		@inject('IR2ImageService') private readonly r2: IR2ImageService,
		@inject('DecorAssetRepository') private readonly stickerRepo: DecorAssetRepository,
	) {}

	list = async (req: AuthRequest, res: Response) => {
		const { category } = req.query;
		const extraWhere: any = { type: 'sticker' };
		if (typeof category === 'string' && VALID_CATEGORIES.has(category as AssetCategory)) {
			extraWhere.category = category;
		}
		const stickers = await this.stickerRepo.list({ ...extraWhere, isDelete: false });
		res.json(ApiResponse.success(stickers));
	};

	create = async (req: AuthRequest, res: Response) => {
		const { url, publicId, name, category } = req.body;
		if (!url) throw new AppError(ErrorCode.UPLOAD_URL_REQUIRED, 400);
		if (category && !VALID_CATEGORIES.has(category)) {
			throw new AppError(ErrorCode.UPLOAD_CATEGORY_INVALID, 400, { validCategories: Object.values(AssetCategory) });
		}
		const sticker = await this.stickerRepo.create({
			url,
			publicId: publicId || '',
			type: 'sticker',
			name: name || '',
			category: category || null,
			createdBy: parseInt(req.userId!),
		});
		res.status(201).json(ApiResponse.success(sticker));
	};

	remove = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const sticker = await this.stickerRepo.findById(id);
		if (!sticker) throw new AppError(ErrorCode.NOT_FOUND, 404);
		await this.stickerRepo.remove(id);
		if (sticker.publicId) {
			this.r2.deleteAsset(sticker.publicId).catch(() => {});
		}
		res.json(ApiResponse.message('Sticker deleted'));
	};
}
