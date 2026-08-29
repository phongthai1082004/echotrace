import { SampleBookService } from './sample-books.service.js';
import { SampleBookRepository } from './sample-books.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { SampleBookService, SampleBookRepository };
export { SampleBookController } from './sample-books.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('ISampleBookService', SampleBookService);
	container.registerSingleton('SampleBookRepository', SampleBookRepository);
}
