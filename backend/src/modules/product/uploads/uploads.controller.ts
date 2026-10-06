import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import type {IR2ImageService} from '../../../shared/r2/r2.service.js';
import { isR2PublicUrl } from '../../../shared/r2/r2.service.js';
import type {IUserImageService} from './user-images.service.js';
import { parseField, parseId } from '../../../shared/middleware/parse-params.js';

@injectable()
export class UploadController {
	constructor(
		@inject('IR2ImageService') private readonly r2: IR2ImageService,
		@inject('IUserImageService') private readonly userImageService: IUserImageService,
	) {}

	getSignature = async (req: AuthRequest, res: Response) => {
		const type = parseField(req.query.type, ['gallery', 'sticker', 'book-thumb'] as const, 'gallery');
		const userId = req.userId!;

		// Stickers are a shared library: only admins may sign uploads into it.
		if (type === 'sticker' && req.userRole !== 'admin') {
			throw new AppError(ErrorCode.ADMIN_ACCESS_REQUIRED, 403);
		}

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
		if (!isR2PublicUrl(url)) throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { url: ['must be an R2 URL'] });

		const image = await this.userImageService.create({ userId, url, publicId, width, height, size });

		res.status(201).json(ApiResponse.success(image));
	};

	listImages = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const bookId = req.query.bookId ? parseId(req.query.bookId) : undefined;

		const images = await this.userImageService.listByUser(userId, bookId);

		res.json(ApiResponse.success(images));
	};

	deleteImage = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const id = parseId(req.params.id);
		await this.userImageService.delete(id, userId);
		res.json(ApiResponse.message('Image deleted'));
	};
}
