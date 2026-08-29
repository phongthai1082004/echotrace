import { PrintOptionService } from './print-options.service.js';
import { PrintOptionRepository } from './print-options.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { PrintOptionService };
export { PrintOptionRepository };
export { PrintOptionController } from './print-options.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IPrintOptionService', PrintOptionService);
	container.registerSingleton('PrintOptionRepository', PrintOptionRepository);
}