import { injectable, inject } from "tsyringe";
import type { IEmailService } from "@echotrace/shared";
import type { NotificationPayload, Observer } from "../events/notification-events.js";

@injectable()
export class EmailObserver implements Observer {
    constructor(@inject('IEmailService') private mail: IEmailService) {}

    async update(p: NotificationPayload) {
        if (!p.channels?.includes('email') || !p.email) return;
        await this.mail.send({ to: p.email, subject: p.title, html: p.message });
    }
}