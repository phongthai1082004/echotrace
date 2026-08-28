import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { ImageDTO, SaveImageDTO, ImageMapper } from '@echotrace/shared';

export interface IUserImageService {
	getById(id: number, userId: number): Promise<ImageDTO>;
	create(data: SaveImageDTO & { userId: number }): Promise<ImageDTO>;
	listByUser(userId: number, bookId?: number): Promise<ImageDTO[]>;
	delete(id: number, userId: number): Promise<void>;
}

@injectable()
export class UserImageService implements IUserImageService {
	public async getById(id: number, userId: number) {
		const image = await prisma.userImage.findFirst({ where: { id, userId, isDelete: false } });
		if (!image) throw new AppError(ErrorCode.IMAGE_NOT_FOUND, 404);
		return ImageMapper.toDTO(image);
	}

	public async create(data: SaveImageDTO & { userId: number }) {
		const image = await prisma.userImage.create({ data: data as any });
		return ImageMapper.toDTO(image);
	}

	public async listByUser(userId: number, bookId?: number) {
		const images = await prisma.userImage.findMany({
			where: { userId, isDelete: false, ...(bookId ? { bookId } : {}) },
			orderBy: { id: 'desc' },
		});
		return ImageMapper.toDTOList(images);
	}

	public async delete(id: number, userId: number) {
		const image = await this.getById(id, userId);
		await prisma.userImage.updateMany({
			where: { id, userId, isDelete: false },
			data: { isDelete: true, deletedAt: new Date() },
		});
		if (image.publicId) {
			const { R2ImageService } = await import('../../infrastructure/r2/r2.service.js');
			const r2 = new R2ImageService();
			await r2.deleteAsset(image.publicId).catch(() => {});
		}
	}
}
