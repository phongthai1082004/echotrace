import { injectable, inject } from 'tsyringe';
import { BaseService } from '../../utils/base.service.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { ImageDTO, SaveImageDTO, ImageMapper } from '@echotrace/shared';

export abstract class IUserImageService {
	abstract getById(id: number, userId: number): Promise<ImageDTO>;
	abstract create(data: SaveImageDTO & { userId: number }): Promise<ImageDTO>;
	abstract listByUser(userId: number, bookId?: number): Promise<ImageDTO[]>;
	abstract delete(id: number, userId: number): Promise<void>;
}

@injectable()
export class UserImageService extends IUserImageService {
	constructor(@inject('UserImageBaseService') private readonly userImageBase: BaseService<any>) {
		super();
	}

	public async getById(id: number, userId: number) {
		const image = await this.userImageBase.findById(id, { userId });
		return ImageMapper.toDTO(image);
	}

	public async create(data: SaveImageDTO & { userId: number }) {
		const image = await this.userImageBase.create(data);
		return ImageMapper.toDTO(image);
	}

	public async listByUser(userId: number, bookId?: number) {
		const images = await this.userImageBase.delegate.findMany({
			where: { userId, isDelete: false, ...(bookId ? { bookId } : {}) },
			orderBy: { id: 'desc' },
		});
		return ImageMapper.toDTOList(images);
	}

	public async delete(id: number, userId: number) {
		const image = await this.getById(id, userId);
		if (!image) throw new AppError(ErrorCode.IMAGE_NOT_FOUND, 404);
		await this.userImageBase.delete(id);
		if (image.publicId) {
			const { R2ImageService } = await import('../../infrastructure/r2/r2.service.js');
			const r2 = new R2ImageService();
			await r2.deleteAsset(image.publicId).catch(() => {});
		}
	}
}
