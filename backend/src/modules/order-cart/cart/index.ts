import { CartService } from './cart.service.js';
import { CartRepository } from './cart.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { CartService };
export { CartRepository } from './cart.repository.js';
export { CartController } from './cart.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('ICartService', CartService);
	container.registerSingleton('CartRepository', CartRepository);
}
