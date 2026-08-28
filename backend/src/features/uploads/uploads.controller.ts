import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { ApiResponse } from '../../middleware/api.response.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { IR2ImageService } from '../../infrastructure/r2/r2.service.js';
import { IUserImageService } from './user-images.service.js';

@injectable()
export class UploadController {
	constructor(
		@inject('IR2ImageService') private readonly r2: IR2ImageService,
		@inject('IUserImageService') private readonly userImageService: IUserImageService,
	) {}

	getSignature = async (req: AuthRequest, res: Response) => {
		const { type } = req.query as { type: 'gallery' | 'sticker' | 'book-thumb' };
		const userId = req.userId!;

		const folder =
			type === 'sticker'
				? 'echotrace/stickers'
				: type === 'book-thumb'
					? `echotrace/books/user_${userId}`
					: `echotrace/gallery/user_${userId}`;

		const ticket = await this.r2.issueUpload(folder);

		res.json(
			ApiResponse.success({
				token: ticket.token,
				expiry: ticket.expiry,
				folder,
				uploadUrl: ticket.uploadUrl,
			}),
		);
	};

	saveImage = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const { url, publicId, width, height, size, thumbUrl } = req.body;
		if (!url) throw new AppError(ErrorCode.UPLOAD_URL_REQUIRED, 400);

		const image = await this.userImageService.create({ userId, url, publicId, width, height, size });

		res.status(201).json(ApiResponse.success(image));
	};

	listImages = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;

		const images = await this.userImageService.listByUser(userId, bookId);

		res.json(ApiResponse.success(images));
	};

	deleteImage = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const id = parseInt(String(req.params.id));
		await this.userImageService.delete(id, userId);
		res.json(ApiResponse.message('Image deleted'));
	};
}
