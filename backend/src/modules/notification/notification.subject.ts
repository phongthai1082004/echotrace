import { injectable } from 'tsyringe';
import type { Observer, NotificationPayload } from '@/modules/notification/events/notification-events.js';

@injectable()
export class NotificationSubject {
    private observers: Observer[] = [];
    // Subcribe an observer
    attach(observer: Observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }
    // Unsubscribe an observer
    detach(observer: Observer) {
        if (this.observers.includes(observer)) {
            this.observers = this.observers.filter(obs => obs != observer)
        }
    }
    async notify(payload: NotificationPayload) {
        await Promise.allSettled(
            this.observers.map(async (observer) => {
                try {
                    await observer.update(payload);
                } catch (error) {
                    console.error(`Observer error:`, error);
                }
            }),
        );
    }
}