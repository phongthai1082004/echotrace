import { injectable, inject } from 'tsyringe';
import type { NotificationPayload, Observer } from '../events/notification-events.js';
import { NotificationChannel } from '@echotrace/shared';
import { PresenceService } from '../channels/presence.service.js';

// ponytail: fast-lane realtime — user online thì đẩy event, offline thì thôi
// (DatabaseObserver vẫn ghi DB, client fetch bù lúc load/reconnect).
// Push mang id tạm `live-*`; poll 60s replace list nên tự hết trùng.
@injectable()
export class SseObserver implements Observer {
	constructor(@inject('PresenceService') private presence: PresenceService) {}

	async update(payload: NotificationPayload): Promise<void> {
		if (!payload.channels?.includes(NotificationChannel.PUSH)) return;
		const userId = Number(payload.userId);
		if (!Number.isFinite(userId)) return;
		try {
			this.presence.sendTo(userId, JSON.stringify({
				id: `live-${Date.now()}`,
				title: payload.title,
				message: payload.message,
				type: payload.type,
				metadata: payload.metadata ?? null,
				createdAt: new Date().toISOString(),
				isRead: false,
			}));
		} catch {
			/* fail-open: push lỗi không chặn notify */
		}
	}
}
