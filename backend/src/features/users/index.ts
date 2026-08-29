import { UserService } from './users.service.js';
import { UserRepository } from './users.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { UserService };
export { UserRepository } from './users.repository.js';
export { UserController } from './users.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IUserService', UserService);
	container.registerSingleton('UserRepository', UserRepository);
}
