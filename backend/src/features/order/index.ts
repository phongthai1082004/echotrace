import { OrderService } from './order.service.js';
import { OrderRepository } from './order.repository.js';
import { OrderFinanceService } from './order-finance.service.js';
import type { DependencyContainer } from 'tsyringe';

export { OrderService } from './order.service.js';
export type { IOrderService } from './order.service.js';
export { OrderRepository } from './order.repository.js';
export { OrderController } from './order.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IOrderService', OrderService);
	container.registerSingleton('OrderRepository', OrderRepository);
	container.registerSingleton('IOrderFinanceService', OrderFinanceService);
}
