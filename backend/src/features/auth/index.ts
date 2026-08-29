import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { AuthService };
export { AuthRepository } from './auth.repository.js';
export { AuthController } from './auth.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IAuthService', AuthService);
	container.registerSingleton('AuthRepository', AuthRepository);
}
