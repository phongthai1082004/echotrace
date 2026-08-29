import { BookService } from './books.service.js';
import { BookRepository } from './books.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { BookService };
export { BookRepository };
export { BookController } from './books.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('IBookService', BookService);
	container.registerSingleton('BookRepository', BookRepository);
}
