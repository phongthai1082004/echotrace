import { injectable, inject } from "tsyringe";
import type { NotificationPayload, Observer } from "../events/notification-events.js"
import { NotificationRepository } from "../channels/notification.repository.js";
import { NotificationChannel } from '@echotrace/shared';

@injectable()
export class DatabaseObserver implements Observer {
    constructor(@inject('NotificationRepository') private notirepo: NotificationRepository) {}
    async update(payload: NotificationPayload): Promise<void> {
        // ponytail: channels is the routing switch — skip when 'db' not listed.
        // No channels = legacy broadcast = write.
        if (payload.channels && !payload.channels.includes(NotificationChannel.DB)) return;
        await this.notirepo.client.notification.create({
            data: {
                userId: Number(payload.userId),
                title: payload.title, message: payload.message,
                type: payload.type, channels: payload.channels ?? [NotificationChannel.DB],
                email: payload.email ?? null, phone: payload.phone ?? null,
                metadata: (payload.metadata ?? null) as any,
            },
        });
    }
}