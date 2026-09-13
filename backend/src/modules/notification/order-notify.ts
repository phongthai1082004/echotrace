import type { NotificationChannel, NotificationType } from '@echotrace/shared';
import type { NotificationSubject } from './notification.subject.js';

export async function notifyOrderUser(
	subject: NotificationSubject,
	client: any,
	opts: {
		userId: number;
		type: NotificationType;
		channels: NotificationChannel[];
		title: string;
		message: string;
		orderId: number;
		orderCode?: string | null;
	},
): Promise<void> {
	try {
		if (!subject || typeof subject.notify !== 'function') return;
		const user = await client?.user
			?.findUnique({ where: { id: opts.userId }, select: { email: true } })
			.catch(() => null);
		await subject.notify({
			userId: String(opts.userId),
			email: user?.email ?? undefined,
			type: opts.type,
			channels: opts.channels,
			title: opts.title,
			message: opts.message,
			metadata: { orderId: opts.orderId, orderCode: opts.orderCode ?? undefined },
		});
	} catch (e) {
		console.error('[notifyOrderUser] failed:', (e as Error)?.message || e);
	}
}
