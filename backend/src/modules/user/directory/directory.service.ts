import { injectable, inject } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { paginate } from '../../../shared/utils/paginate.js';
import { UserListDTO, UserMapper } from '@echotrace/shared';
import { UserRepository } from '../repositories/users.repository.js';

export interface IDirectoryService {
	findAll(filter: any, options?: any, extraWhere?: any): Promise<{ items: UserListDTO[]; nextCursor: number | null }>;
	findById(id: number, extraWhere?: Record<string, any>): Promise<any>;
	update(id: number, data: any, extraWhere?: Record<string, any>): Promise<void>;
}

@injectable()
export class DirectoryService implements IDirectoryService {
	constructor(@inject('UserRepository') private userRepo: UserRepository) {}

	public async findAll(filter: any, options?: any, extraWhere?: any) {
		const { items, nextCursor } = await paginate(this.userRepo.client.user, filter, options, extraWhere);
		return { items: UserMapper.toDTOList(items), nextCursor };
	}

	public async findById(id: number, extraWhere: Record<string, any> = {}) {
		const user = await this.userRepo.findById(id, extraWhere);
		if (!user) throw new AppError(ErrorCode.NOT_FOUND, 404);
		return user;
	}

	public async update(id: number, data: any, extraWhere: Record<string, any> = {}) {
		const result = await this.userRepo.updateById(id, data, extraWhere);
		if (result.count === 0) throw new AppError(ErrorCode.NOT_FOUND, 404);
	}
}
