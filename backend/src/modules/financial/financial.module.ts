import type { DependencyContainer } from 'tsyringe';
import { FinanceService } from './ledger/finance.service.js';
import { FinanceRepository } from './ledger/finance.repository.js';
import { PaymentWebhookService } from './payments/payment.service.js';
import { PaymentWebhookRepository } from './payments/payment.repository.js';
import { SupplierService } from './suppliers/suppliers.service.js';
import { SupplierRepository } from './suppliers/suppliers.repository.js';
import { OrderFinanceService } from './settlement/order-finance.bridge.js';

export function registerFinancial(container: DependencyContainer): void {
	container.registerSingleton('IFinanceService', FinanceService);
	container.registerSingleton('FinanceRepository', FinanceRepository);
	container.registerSingleton('IPaymentWebhookService', PaymentWebhookService);
	container.registerSingleton('PaymentWebhookRepository', PaymentWebhookRepository);
	container.registerSingleton('ISupplierService', SupplierService);
	container.registerSingleton('SupplierRepository', SupplierRepository);
	container.registerSingleton('IOrderFinanceService', OrderFinanceService);
}
