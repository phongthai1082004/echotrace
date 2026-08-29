import { PaymentWebhookService } from './payment.service.js';
import { PaymentWebhookRepository } from './payment.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { PaymentWebhookService } from './payment.service.js';
export type { IPaymentWebhookService } from './payment.service.js';
export { PaymentWebhookRepository } from './payment.repository.js';
export { PaymentController } from './payment.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IPaymentWebhookService', PaymentWebhookService);
	container.registerSingleton('PaymentWebhookRepository', PaymentWebhookRepository);
}
