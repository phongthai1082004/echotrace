import { injectable, inject } from 'tsyringe';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { paginate } from '../../utils/paginate.js';
import bcrypt from 'bcryptjs';
import { UserListDTO, UserMapper } from '@echotrace/shared';
import { ProfileDTO, UpdateProfileDTO, ChangePasswordDTO, ProfileMapper } from '@echotrace/shared';
import { UserRepository } from './users.repository.js';

export interface IUserService {
	findAll(filter: any, options?: any, extraWhere?: any): Promise<{ items: UserListDTO[]; nextCursor: number | null }>;
	findById(id: number, extraWhere?: Record<string, any>): Promise<any>;
	update(id: number, data: any, extraWhere?: Record<string, any>): Promise<void>;
	getProfile(userId: string): Promise<ProfileDTO>;
	updateProfile(userId: string, data: UpdateProfileDTO): Promise<ProfileDTO>;
	changePassword(userId: string, body: ChangePasswordDTO): Promise<{ message: string }>;
}

@injectable()
export class UserService implements IUserService {
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

	async getProfile(userId: string) {
		const user = await this.userRepo.findByIdFull(parseInt(userId));
		if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, 404);
		const { password, ...safe } = user;
		return ProfileMapper.toDTO({ ...safe, hasPassword: !!password });
	}

	async updateProfile(userId: string, data: UpdateProfileDTO) {
		if (data.phone) {
			const cleaned = data.phone.replace(/\s+/g, '');
			if (!/^(\+84|0)[1-9]\d{8,9}$/.test(cleaned)) {
				throw new AppError(ErrorCode.USER_INVALID_PHONE, 400);
			}
			const dupPhone = await this.userRepo.findByPhone(cleaned);
			if (dupPhone && dupPhone.id !== parseInt(userId)) {
				throw new AppError(ErrorCode.USER_PHONE_EXISTS, 409);
			}
			data.phone = cleaned;
		}

		try {
			await this.userRepo.updateUser(parseInt(userId), data as unknown as Record<string, unknown>);
			return this.getProfile(userId);
		} catch (error: any) {
			if (error && error.code === 'P2025') {
				throw new AppError(ErrorCode.USER_NOT_FOUND_UPDATE, 404);
			}
			// ponytail: DB unique index on phone catches the race that slips past the
			// in-service findByPhone check (two concurrent requests with the same phone).
			if (error && error.code === 'P2002') {
				throw new AppError(ErrorCode.USER_PHONE_EXISTS, 409);
			}
			throw error;
		}
	}

	async changePassword(userId: string, body: ChangePasswordDTO) {
		const user = await this.userRepo.findByIdForPassword(parseInt(userId));
		if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, 404);

		if (user.password) {
			if (!body.currentPassword) throw new AppError(ErrorCode.USER_CURRENT_PASSWORD_REQUIRED, 400);
			const valid = await bcrypt.compare(body.currentPassword, user.password);
			if (!valid) throw new AppError(ErrorCode.USER_CURRENT_PASSWORD_WRONG, 400);
		}

		if (body.newPassword.length < 6) throw new AppError(ErrorCode.USER_NEW_PASSWORD_MIN_LENGTH, 400);

		const hashed = await bcrypt.hash(body.newPassword, 10);
		await this.userRepo.updateUser(parseInt(userId), { password: hashed });
		return { message: 'Password updated successfully' };
	}
}
