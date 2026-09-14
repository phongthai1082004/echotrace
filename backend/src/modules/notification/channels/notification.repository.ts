import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';

export interface NotificationRow {
	id: number;
	userId: number;
	title: string;
	message: string;
	sendBy: string;
	type: string;
	channels: string[];
	email: string | null;
	phone: string | null;
	metadata: unknown;
	isRead: boolean;
	createdAt: Date;
	updatedAt: Date;
}

@injectable()
export class NotificationRepository {
	constructor(@inject('PrismaService') private prisma: PrismaService) {}

	get client() {
		return this.prisma.db;
	}

	getNotificationList(userId: number, limit: number, cursor?: number, tx?: any): Promise<NotificationRow[]> {
		return (tx ?? this.client).notification.findMany({
			where: { userId },
			orderBy: [{ createdAt: 'desc' }],
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
			take: limit,
		});
	}

	markRead(id: number, tx?: any): Promise<NotificationRow> {
		return (tx ?? this.client).notification.update({ where: { id }, data: { isRead: true } });
	}

	/** Mark own notification read; returns affected count (0 = not yours). */
	markReadOwned(id: number, userId: number, tx?: any): Promise<number> {
		return (tx ?? this.client).notification
			.updateMany({ where: { id, userId }, data: { isRead: true } })
			.then((r: { count: number }) => r.count);
	}
}
