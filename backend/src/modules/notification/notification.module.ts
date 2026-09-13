import type { DependencyContainer } from 'tsyringe';
import { NotificationRepository } from './store/notification.repository.js';
import { EmailService } from './channels/email.service.js';
import { NotificationSubject } from './notification.subject.js'
import { DatabaseObserver } from './observers/database.observer.js'
import { EmailObserver } from './observers/email.observer.js'

export function registerNotification(container: DependencyContainer): void {
	container.registerSingleton('NotificationRepository', NotificationRepository);
	container.registerSingleton('IEmailService', EmailService);
	container.registerSingleton('NotificationSubject', NotificationSubject);
	container.registerSingleton('EmailObserver', EmailObserver);
	container.registerSingleton('DbObserver', DatabaseObserver);
	const subject = container.resolve<NotificationSubject>('NotificationSubject');
	subject.attach(container.resolve<DatabaseObserver>('DbObserver'));
	subject.attach(container.resolve<EmailObserver>('EmailObserver'));
}
