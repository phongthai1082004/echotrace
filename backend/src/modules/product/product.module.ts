import type { DependencyContainer } from 'tsyringe';
import { BookService } from './books/books.service.js';
import { BookRepository } from './books/books.repository.js';
import { BookPageDeltaRepository } from './books/book-delta.repository.js';
import { SampleBookService } from './sample-books/sample-books.service.js';
import { SampleBookRepository } from './sample-books/sample-books.repository.js';
import { StockService } from './sample-books/stock.service.js';
import { DecorAssetRepository } from './stickers/stickers.repository.js';
import { StickerService } from './stickers/stickers.service.js';
import { PrintOptionService } from './print-options/print-options.service.js';
import { PrintOptionRepository } from './print-options/print-options.repository.js';
import { UserImageService } from './uploads/user-images.service.js';
import { UserImagesRepository } from './uploads/user-images.repository.js';
import { OptionCatalogCacheService } from './catalog/option-catalog.cache.service.js';
import { SampleBookCacheService } from './catalog/sample-book.cache.service.js';

export function registerProduct(container: DependencyContainer): void {
	container.registerSingleton('IOptionCatalogCacheService', OptionCatalogCacheService);
	container.registerSingleton('ISampleBookCacheService', SampleBookCacheService);
	container.registerSingleton('IBookService', BookService);
	container.registerSingleton('BookRepository', BookRepository);
	container.registerSingleton('BookPageDeltaRepository', BookPageDeltaRepository);
	container.registerSingleton('ISampleBookService', SampleBookService);
	container.registerSingleton('SampleBookRepository', SampleBookRepository);
	container.registerSingleton('IStockService', StockService);
	container.registerSingleton('DecorAssetRepository', DecorAssetRepository);
	container.registerSingleton('IStickerService', StickerService);
	container.registerSingleton('IPrintOptionService', PrintOptionService);
	container.registerSingleton('PrintOptionRepository', PrintOptionRepository);
	container.registerSingleton('IUserImageService', UserImageService);
	container.registerSingleton('UserImagesRepository', UserImagesRepository);
}
