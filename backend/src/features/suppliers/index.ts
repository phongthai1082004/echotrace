import { SupplierService } from './suppliers.service.js';
import { SupplierRepository } from './suppliers.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { SupplierService };
export { SupplierRepository };
export { SupplierController } from './suppliers.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('ISupplierService', SupplierService);
	container.registerSingleton('SupplierRepository', SupplierRepository);
}
