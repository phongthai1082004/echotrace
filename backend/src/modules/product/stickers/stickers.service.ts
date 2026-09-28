import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { AssetCategory } from '@echotrace/shared';
import type { IR2ImageService } from '../../../shared/r2/r2.service.js';
import { isR2PublicUrl } from '../../../shared/r2/r2.service.js';
import { DecorAssetRepository } from './stickers.repository.js';

const VALID_CATEGORIES = new Set(Object.values(AssetCategory));

export interface IStickerService {
	list(category?: unknown): Promise<unknown[]>;
	create(input: { url: string; publicId?: string; name?: string; category?: string }, userId: number): Promise<unknown>;
	remove(id: number): Promise<void>;
}

@injectable()
export class StickerService implements IStickerService {
	constructor(
		@inject('IR2ImageService') private readonly r2: IR2ImageService,
		@inject('DecorAssetRepository') private readonly stickerRepo: DecorAssetRepository,
	) {}

	async list(category?: unknown) {
		const extraWhere: any = { type: 'sticker' };
		if (typeof category === 'string' && VALID_CATEGORIES.has(category as AssetCategory)) {
			extraWhere.category = category;
		}
		return this.stickerRepo.list({ ...extraWhere, isDelete: false });
	}

	async create(input: { url: string; publicId?: string; name?: string; category?: string }, userId: number) {
		const { url, publicId, name, category } = input;
		if (!url) throw new AppError(ErrorCode.UPLOAD_URL_REQUIRED, 400);
		if (!isR2PublicUrl(url)) throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { url: ['must be an R2 URL'] });
		if (category && !VALID_CATEGORIES.has(category as AssetCategory)) {
			throw new AppError(ErrorCode.UPLOAD_CATEGORY_INVALID, 400, { validCategories: Object.values(AssetCategory) });
		}
		return this.stickerRepo.create({
			url,
			publicId: publicId || '',
			type: 'sticker',
			name: name || '',
			category: category || null,
			createdBy: userId,
		});
	}

	async remove(id: number) {
		const sticker = await this.stickerRepo.findById(id);
		if (!sticker) throw new AppError(ErrorCode.NOT_FOUND, 404);
		await this.stickerRepo.remove(id);
		if (sticker.publicId) {
			this.r2.deleteAsset(sticker.publicId).catch(() => {});
		}
	}
}
