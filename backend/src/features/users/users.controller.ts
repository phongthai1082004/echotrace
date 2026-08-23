import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { prisma } from '../../../lib/prisma.js';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { IUserService } from './users.service.js';
import { ApiResponse } from '../../middleware/api.response.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class UserController {
	constructor(@inject('IUserService') private readonly userService: IUserService) {}

	getProfile = async (req: AuthRequest, res: Response) => {
		const result = await this.userService.getProfile(req.userId!);
		res.json(ApiResponse.success(result));
	};

	updateProfile = async (req: AuthRequest, res: Response) => {
		const { name, phone, address, city } = req.body;
		const result = await this.userService.updateProfile(req.userId!, { name, phone, address, city });
		res.json(ApiResponse.success(result));
	};

	changePassword = async (req: AuthRequest, res: Response) => {
		const result = await this.userService.changePassword(req.userId!, req.body);
		res.json(ApiResponse.success(result));
	};

	getUserList = async (req: AuthRequest, res: Response) => {
		const { status, customerId, search, order, limit, cursor, field } = req.query;
		const extraWhere: any = {};
		if (status === 'banned') extraWhere.isDelete = true;
		else if (status === 'active') extraWhere.isDelete = false;
		else extraWhere.isDelete = undefined;
		const params = {
			customerId: customerId ? Number(customerId) : undefined,
			search: search as string | undefined,
			order: (order as string) || 'desc',
			limit: limit ? Number(limit) : 1000,
			cursor: cursor ? Number(cursor) : undefined,
		};
		const searchFields =
			field === 'name' ? ['name'] : field === 'email' ? ['email'] : field === 'phone' ? ['phone'] : ['name', 'email', 'phone'];
		const options = { searchFields, allowedFilterFields: [] };
		const { items, nextCursor } = await this.userService.findAll(params, options, extraWhere);
		res.json(ApiResponse.success({ users: items, nextCursor }));
	};

	updateUserStatus = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const { status } = req.body;
		if (!status || !['active', 'banned'].includes(status)) {
			throw new AppError(ErrorCode.ADMIN_INVALID_STATUS, 400);
		}
		const banned = status === 'banned';
		const target = await prisma.user.findUnique({ where: { id } });
		if (!target) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (target.role === 'admin') {
			throw new AppError(ErrorCode.ADMIN_CANNOT_BAN_ADMIN, 403);
		}
		const updated = await prisma.user.update({
			where: { id },
			data: { isDelete: banned, deletedAt: banned ? new Date() : null },
		});
		res.json(
			ApiResponse.success({
				id: updated.id,
				name: updated.name,
				email: updated.email,
				banned: updated.isDelete,
			}),
		);
	};
}
