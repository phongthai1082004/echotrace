import { UserImageService } from './user-images.service.js';
import { UserImagesRepository } from './user-images.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { UserImageService };
export { UserImagesRepository };
export { UploadController } from './uploads.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IUserImageService', UserImageService);
	container.registerSingleton('UserImagesRepository', UserImagesRepository);
}
