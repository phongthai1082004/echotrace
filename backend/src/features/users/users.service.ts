import { injectable, inject } from 'tsyringe';
import { BaseService } from '../../utils/base.service.js';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import bcrypt from 'bcryptjs';
import { UserListDTO, UserMapper } from '@echotrace/shared';
import { ProfileDTO, UpdateProfileDTO, ChangePasswordDTO, ProfileMapper } from '@echotrace/shared';

export abstract class IUserService {
	abstract findAll(filter: any, options?: any, extraWhere?: any): Promise<{ items: UserListDTO[]; nextCursor: number | null }>;
	abstract findById(id: number, extraWhere?: Record<string, any>): Promise<any>;
	abstract update(id: number, data: any, extraWhere?: Record<string, any>): Promise<void>;
	abstract getProfile(userId: string): Promise<ProfileDTO>;
	abstract updateProfile(userId: string, data: UpdateProfileDTO): Promise<ProfileDTO>;
	abstract changePassword(userId: string, body: ChangePasswordDTO): Promise<{ message: string }>;
}

@injectable()
export class UserService extends IUserService {
	constructor(@inject('UserBaseService') private readonly userBase: BaseService<any>) {
		super();
	}

	public async findAll(filter: any, options?: any, extraWhere?: any) {
		return await this.userBase.findAll(filter, options, extraWhere);
	}

	public async findById(id: number, extraWhere: Record<string, any> = {}) {
		return await this.userBase.findById(id, extraWhere);
	}

	public async update(id: number, data: any, extraWhere: Record<string, any> = {}) {
		return await this.userBase.update(id, data, extraWhere);
	}

	async getProfile(userId: string) {
		const user = await prisma.user.findUnique({
			where: { id: parseInt(userId) },
			select: {
				id: true,
				email: true,
				name: true,
				avatar: true,
				phone: true,
				address: true,
				city: true,
				role: true,
				isDelete: true,
				password: true,
			},
		});
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
			const dupPhone = await prisma.user.findFirst({ where: { phone: cleaned } });
			if (dupPhone && dupPhone.id !== parseInt(userId)) {
				throw new AppError(ErrorCode.USER_PHONE_EXISTS, 409);
			}
			data.phone = cleaned;
		}

		try {
			await prisma.user.update({
				where: { id: parseInt(userId) },
				data,
			});
			return this.getProfile(userId);
		} catch (error: any) {
			if (error && error.code === 'P2025') {
				throw new AppError(ErrorCode.USER_NOT_FOUND_UPDATE, 404);
			}
			throw error;
		}
	}

	async changePassword(userId: string, body: ChangePasswordDTO) {
		const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
		if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, 404);

		if (user.password) {
			if (!body.currentPassword) throw new AppError(ErrorCode.USER_CURRENT_PASSWORD_REQUIRED, 400);
			const valid = await bcrypt.compare(body.currentPassword, user.password);
			if (!valid) throw new AppError(ErrorCode.USER_CURRENT_PASSWORD_WRONG, 400);
		}

		if (body.newPassword.length < 6) throw new AppError(ErrorCode.USER_NEW_PASSWORD_MIN_LENGTH, 400);

		const hashed = await bcrypt.hash(body.newPassword, 10);
		await prisma.user.update({ where: { id: parseInt(userId) }, data: { password: hashed } });
		return { message: 'Password updated successfully' };
	}
}
