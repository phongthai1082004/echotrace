import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {IDirectoryService} from './directory.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { parseId, parseLimit, parseOrder } from '../../../shared/middleware/parse-params.js';

@injectable()
export class DirectoryController {
	constructor(
		@inject('IDirectoryService') private readonly directoryService: IDirectoryService,
	) {}

	getUserList = async (req: AuthRequest, res: Response) => {
		const { status, customerId, search, order, limit, cursor, field } = req.query;
		const extraWhere: any = {};
		if (status === 'banned') extraWhere.isDelete = true;
		else if (status === 'active') extraWhere.isDelete = false;
		else extraWhere.isDelete = undefined;
		const cid = customerId !== undefined ? Number(customerId) : undefined;
		const cur = cursor !== undefined ? Number(cursor) : undefined;
		const params = {
			customerId: Number.isInteger(cid) ? cid : undefined,
			search: search as string | undefined,
			order: parseOrder(order),
			limit: parseLimit(limit, 20) ?? 20,
			cursor: Number.isFinite(cur) ? cur : undefined,
		};
		const searchFields =
			field === 'name' ? ['name'] : field === 'email' ? ['email'] : field === 'phone' ? ['phone'] : ['name', 'email', 'phone'];
		const options = { searchFields, allowedFilterFields: [] };
		const { items, nextCursor } = await this.directoryService.findAll(params, options, extraWhere);
		res.json(ApiResponse.success({ users: items, nextCursor }));
	};

	updateUserStatus = async (req: AuthRequest, res: Response) => {
		const id = parseId(req.params.id);
		const { status } = req.body;
		if (!status || !['active', 'banned'].includes(status)) {
			throw new AppError(ErrorCode.ADMIN_INVALID_STATUS, 400);
		}
		res.json(ApiResponse.success(await this.directoryService.setUserStatus(id, status === 'banned')));
	};
}
