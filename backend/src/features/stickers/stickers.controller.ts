import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { ApiResponse } from '../../middleware/api.response.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { BaseService } from '../../utils/base.service.js';
import { AssetCategory } from '@echotrace/shared';
import { IR2ImageService } from '../../infrastructure/r2/r2.service.js';

const VALID_CATEGORIES = new Set(Object.values(AssetCategory));

@injectable()
export class StickerController {
	constructor(
		@inject('IR2ImageService') private readonly r2: IR2ImageService,
		@inject('DecorAssetBaseService') private readonly base: BaseService<any>,
	) {}

	list = async (req: AuthRequest, res: Response) => {
		const { category } = req.query;
		const extraWhere: any = { type: 'sticker' };
		if (typeof category === 'string' && VALID_CATEGORIES.has(category as AssetCategory)) {
			extraWhere.category = category;
		}
		const stickers = await this.base.delegate.findMany({
			where: { ...extraWhere, isDelete: false },
			orderBy: { id: 'desc' },
		});
		res.json(ApiResponse.success(stickers));
	};

	create = async (req: AuthRequest, res: Response) => {
		const { url, publicId, name, category } = req.body;
		if (!url) throw new AppError(ErrorCode.UPLOAD_URL_REQUIRED, 400);
		if (category && !VALID_CATEGORIES.has(category)) {
			throw new AppError(ErrorCode.UPLOAD_CATEGORY_INVALID, 400, { validCategories: Object.values(AssetCategory) });
		}
		const sticker = await this.base.create({
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
		const sticker = await this.base.findById(id);
		await this.base.hardDelete(id);
		if (sticker.publicId) {
			this.r2.deleteAsset(sticker.publicId).catch(() => {});
		}
		res.json(ApiResponse.message('Sticker deleted'));
	};
}
