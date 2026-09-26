import type { NotificationType } from '@echotrace/shared';
import { NotificationChannel } from '@echotrace/shared';
import type { NotificationSubject } from '../notification.subject.js';
export async function notifyOrderUser(
	subject: NotificationSubject,
	client: any,
	opts: {
		userId: number;
		type: NotificationType;
		channels: NotificationChannel[];
		title: string;
		message: string;
		i18n?: { title?: Record<string, string>; message?: Record<string, string> } | null;
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
			// khỏi sửa từng call site lifecycle/returns
			channels: Array.from(new Set([...opts.channels, NotificationChannel.PUSH])),
			title: opts.title,
			message: opts.message,
			i18n: opts.i18n ?? null,
			metadata: { orderId: opts.orderId, orderCode: opts.orderCode ?? undefined },
		});
	} catch (e) {
		console.error('[notifyOrderUser] failed:', (e as Error)?.message || e);
	}
}

// Dùng cho sự kiện cần admin xử lý: đơn mới, khách hủy, yêu cầu đổi trả.
export async function notifyAdmins(
	subject: NotificationSubject,
	client: any,
	opts: {
		type: NotificationType;
		title: string;
		message: string;
		i18n?: { title?: Record<string, string>; message?: Record<string, string> } | null;
		orderId?: number;
		orderCode?: string | number | null;
		actionUrl?: string;
	},
): Promise<void> {
	try {
		if (!subject || typeof subject.notify !== 'function') return;
		const admins = await client?.user
			?.findMany({ where: { role: 'admin', isDelete: false }, select: { id: true } })
			.catch(() => []);
		if (!admins?.length) return;
		await Promise.allSettled(
			admins.map((a: { id: number }) =>
				subject.notify({
					userId: String(a.id),
					type: opts.type,
					channels: [NotificationChannel.DB, NotificationChannel.PUSH],
					title: opts.title,
					message: opts.message,
					i18n: opts.i18n ?? null,
					metadata: {
						orderId: opts.orderId,
						orderCode: opts.orderCode ?? undefined,
						actionUrl: opts.actionUrl ?? '/admin/dispatch',
					},
				}),
			),
		);
	} catch (e) {
		console.error('[notifyAdmins] failed:', (e as Error)?.message || e);
	}
}
