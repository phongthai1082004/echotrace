import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../shared/middleware/api.response.js';
import { NotificationRepository } from './channels/notification.repository.js';
import { PresenceService } from './channels/presence.service.js';
import { BroadcastNotificationDTO, NotificationType } from '@echotrace/shared';
import { broadcastNotification } from './notify/broadcast.js';

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

	markUnread = async (req: AuthRequest, res: Response) => {
		const marked = await this.repo.markUnreadOwned(Number(req.params.id), Number(req.userId!));
		res.json(ApiResponse.success({ marked }));
	};

	// i18n 3 thứ tiếng nằm trong metadata (không migration); title/message gốc = tiếng Việt.
	broadcast = async (req: AuthRequest, res: Response) => {
		const body = req.body as BroadcastNotificationDTO;
		const pick = (s: string | undefined, fb: string, max: number) =>
			s?.trim() ? s.trim().slice(0, max) : fb;
		const titleVi = body.titleVi.trim();
		const messageVi = body.messageVi.trim();
		const result = await broadcastNotification({
			type: NotificationType.SYSTEM,
			title: titleVi,
			message: messageVi,
			sendBy: 'shop',
			i18n: {
				title: { vi: titleVi, en: pick(body.titleEn, titleVi, 120), es: pick(body.titleEs, titleVi, 120) },
				message: { vi: messageVi, en: pick(body.messageEn, messageVi, 2000), es: pick(body.messageEs, messageVi, 2000) },
			},
		});
		res.json(ApiResponse.success(result));
	};

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
