import { container } from '../../../di/container.js';
import { PrismaService } from '../../../../lib/db.service.js';
import { NotificationChannel, NotificationType } from '@echotrace/shared';
import { PresenceService } from '../channels/presence.service.js';

// Đi thẳng DB (createMany 1 query, vài ms với 500 users) thay vì qua subject
// từng user. Offline thì thôi, lần sau vào app fetch là thấy.
export async function broadcastNotification(opts: {
	type: NotificationType;
	title: string;
	message: string;
	metadata?: Record<string, unknown> | null;
	i18n?: { title: Record<string, string>; message: Record<string, string> } | null;
	sendBy?: string;
}): Promise<{ users: number }> {
	try {
		const db = container.resolve(PrismaService).db;
		const users = await db.user.findMany({ where: { isDelete: false }, select: { id: true } });
		if (!users.length) return { users: 0 };
		const now = new Date();
		await db.notification.createMany({
			data: users.map((u) => ({
				userId: u.id,
				title: opts.title,
				message: opts.message,
				type: opts.type,
				channels: [NotificationChannel.DB, NotificationChannel.PUSH],
				scope: 'broadcast',
				sendBy: opts.sendBy ?? 'system',
				metadata: (opts.metadata ?? null) as any,
				i18n: (opts.i18n ?? null) as any,
			})),
		});
		try {
			const presence = container.resolve<PresenceService>('PresenceService');
			for (const u of users) {
				try {
				presence.sendTo(u.id, JSON.stringify({
					id: `live-${Date.now()}-${u.id}`,
					title: opts.title,
					message: opts.message,
					type: opts.type,
					metadata: opts.metadata ?? null,
					i18n: opts.i18n ?? null,
					createdAt: now.toISOString(),
					isRead: false,
				}));
				} catch {}
			}
		} catch {}
		return { users: users.length };
	} catch (e) {
		console.error('[broadcast] failed:', (e as Error)?.message || e);
		return { users: 0 };
	}
}
