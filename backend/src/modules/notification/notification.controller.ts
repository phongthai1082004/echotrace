import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../shared/middleware/api.response.js';
import { NotificationRepository } from './channels/notification.repository.js';
import { PresenceService } from './channels/presence.service.js';

@injectable()
export class NotificationController {
	constructor(
		@inject('NotificationRepository') private readonly repo: NotificationRepository,
		@inject('PresenceService') private readonly presence: PresenceService,
	) {}

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

	// ponytail: SSE fast-lane — giữ connection trong PresenceService, client
	// EventSource tự reconnect; req close thì gỡ khỏi map chống connection ma.
	stream = async (req: AuthRequest, res: Response) => {
		const userId = Number(req.userId!);
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-store',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		});
		res.write(': connected\n\n');
		this.presence.add(userId, res);
		req.on('close', () => this.presence.remove(userId, res));
	};
}
