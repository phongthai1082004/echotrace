import type { DependencyContainer } from 'tsyringe';
import { NotificationRepository } from './store/notification.repository.js';
import { EmailService } from './channels/email.service.js';

export function registerNotification(container: DependencyContainer): void {
	container.registerSingleton('NotificationRepository', NotificationRepository);
	container.registerSingleton('IEmailService', EmailService);
}
