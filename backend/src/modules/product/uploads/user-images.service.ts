import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { ImageDTO, SaveImageDTO, ImageMapper } from '@echotrace/shared';
import { UserImagesRepository } from './user-images.repository.js';
import type { IR2ImageService } from '../../../shared/r2/r2.service.js';

export interface IUserImageService {
	getById(id: number, userId: number): Promise<ImageDTO>;
	create(data: SaveImageDTO & { userId: number }): Promise<ImageDTO>;
	listByUser(userId: number, bookId?: number): Promise<ImageDTO[]>;
	delete(id: number, userId: number): Promise<void>;
}

@injectable()
export class UserImageService implements IUserImageService {
	constructor(
		@inject('UserImagesRepository') private userImagesRepo: UserImagesRepository,
		@inject('IR2ImageService') private r2: IR2ImageService,
	) {}

	public async getById(id: number, userId: number) {
		const image = await this.userImagesRepo.findByIdForUser(id, userId);
		if (!image) throw new AppError(ErrorCode.IMAGE_NOT_FOUND, 404);
		return ImageMapper.toDTO(image);
	}

	public async create(data: SaveImageDTO & { userId: number }) {
		// default rỗng như stickers, tránh 500 Prisma validation
		const image = await this.userImagesRepo.createUserImage({ ...data, publicId: data.publicId || '' } as any);
		return ImageMapper.toDTO(image);
	}

	public async listByUser(userId: number, bookId?: number) {
		const images = await this.userImagesRepo.listByUser(userId, bookId);
		return ImageMapper.toDTOList(images);
	}

	public async delete(id: number, userId: number) {
		const image = await this.getById(id, userId);
		await this.userImagesRepo.deleteUserImage(id, userId);
		if (image.publicId) {
			await this.r2.deleteAsset(image.publicId).catch(() => {});
		}
	}
}
