import type { DependencyContainer } from 'tsyringe';
import { UserRepository } from './repositories/users.repository.js';
import { DirectoryService } from './directory/directory.service.js';
import { ProfileService } from './profile/profile.service.js';

export function registerUser(container: DependencyContainer): void {
	container.registerSingleton('UserRepository', UserRepository);
	container.registerSingleton('IDirectoryService', DirectoryService);
	container.registerSingleton('IProfileService', ProfileService);
}
