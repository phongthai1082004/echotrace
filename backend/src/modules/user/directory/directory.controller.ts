import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { IDirectoryService } from './directory.service.js';
import { UserRepository } from '../repositories/users.repository.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class DirectoryController {
	constructor(
		@inject('IDirectoryService') private readonly directoryService: IDirectoryService,
		@inject('UserRepository') private readonly userRepo: UserRepository,
	) {}

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
		const { items, nextCursor } = await this.directoryService.findAll(params, options, extraWhere);
		res.json(ApiResponse.success({ users: items, nextCursor }));
	};

	updateUserStatus = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const { status } = req.body;
		if (!status || !['active', 'banned'].includes(status)) {
			throw new AppError(ErrorCode.ADMIN_INVALID_STATUS, 400);
		}
		const banned = status === 'banned';
		const target = await this.userRepo.findRoleById(id);
		if (!target) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (target.role === 'admin') {
			throw new AppError(ErrorCode.ADMIN_CANNOT_BAN_ADMIN, 403);
		}
		const updated = await this.userRepo.updateUser(id, { isDelete: banned, deletedAt: banned ? new Date() : null });
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
