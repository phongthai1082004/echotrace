import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../shared/middleware/api.response.js';
import { NotificationRepository } from './store/notification.repository.js';

@injectable()
export class NotificationController {
	constructor(@inject('NotificationRepository') private readonly repo: NotificationRepository) {}

	list = async (req: AuthRequest, res: Response) => {
		const limit = Math.min(Number(req.query.limit) || 20, 50);
		const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
		const items = await this.repo.getNotificationList(Number(req.userId!), limit, cursor);
		res.json(ApiResponse.success(items));
	};

	markRead = async (req: AuthRequest, res: Response) => {
		const marked = await this.repo.markReadOwned(Number(req.params.id), Number(req.userId!));
		res.json(ApiResponse.success({ marked }));
	};
}
