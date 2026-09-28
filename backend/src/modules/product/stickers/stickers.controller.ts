import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import type { IStickerService } from './stickers.service.js';

@injectable()
export class StickerController {
	constructor(@inject('IStickerService') private readonly stickerService: IStickerService) {}

	list = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.stickerService.list(req.query.category)));
	};

	create = async (req: AuthRequest, res: Response) => {
		const { url, publicId, name, category } = req.body;
		if (!url) throw new AppError(ErrorCode.UPLOAD_URL_REQUIRED, 400);
		const sticker = await this.stickerService.create({ url, publicId, name, category }, parseInt(req.userId!));
		res.status(201).json(ApiResponse.success(sticker));
	};

	remove = async (req: AuthRequest, res: Response) => {
		await this.stickerService.remove(parseInt(String(req.params.id)));
		res.json(ApiResponse.message('Sticker deleted'));
	};
}
