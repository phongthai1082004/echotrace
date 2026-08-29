import { FinanceService } from './finance.service.js';
import { FinanceRepository } from './finance.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { FinanceService } from './finance.service.js';
export type { IFinanceService } from './finance.service.js';
export { FinanceRepository } from './finance.repository.js';
export { FinanceController } from './finance.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IFinanceService', FinanceService);
	container.registerSingleton('FinanceRepository', FinanceRepository);
}
