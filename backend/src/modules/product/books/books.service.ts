import { injectable, inject } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { BookDTO, CreateBookDTO, UpdatePagesDTO, BookMapper } from '@echotrace/shared';
import { resolveContent } from '../catalog/merge-book-content.js';
import { BookRepository } from './books.repository.js';

export interface IBookService {
	getById(bookId: number, userId: number): Promise<BookDTO>;
	getMyBooks(userId: number): Promise<BookDTO[]>;
	create(userId: number, data: CreateBookDTO, attribution?: unknown): Promise<BookDTO>;
	delete(bookId: number, userId: number): Promise<void>;
	updatePages(bookId: number, userId: number, data: UpdatePagesDTO): Promise<void>;
}

@injectable()
export class BookService implements IBookService {
	constructor(@inject('BookRepository') private bookRepo: BookRepository) {}

	async getById(bookId: number, userId: number) {
		const book = await this.bookRepo.findBookById(bookId);
		if (!book) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (book.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		return BookMapper.toDTO(book);
	}

	async getMyBooks(userId: number) {
		const books = await this.bookRepo.listBooksByUser(userId);
		return BookMapper.toDTOList(books);
	}

	async create(userId: number, data: CreateBookDTO, attribution?: unknown) {
		const touch = attribution as { source?: unknown; medium?: unknown; campaign?: unknown } | undefined;
		const source = String(touch?.source ?? '').trim().toLowerCase().slice(0, 64) || null;
		const book = await this.bookRepo.createBook({
			user: { connect: { id: userId } },
			type: 'TRAVEL',
			title: data.title || 'Untitled',
			style: 'PHOTOBOOK',
			font: 'Inter',
			cover: 'softcover',
			paperHeight: data.paperHeight ?? null,
			paperWidth: data.paperWidth ?? null,
			content: data.content ?? null,
			utmSource: source,
			utmMedium: source ? String(touch?.medium ?? '').trim().toLowerCase().slice(0, 64) || null : null,
			utmCampaign: source ? String(touch?.campaign ?? '').trim().slice(0, 128) || null : null,
		});

		const dto = BookMapper.toDTO(book);
		dto.content = null;
		return dto;
	}

	async delete(bookId: number, userId: number) {
		const book = await this.bookRepo.findBookById(bookId);
		if (!book) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (book.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		await this.bookRepo.deleteBook(bookId);
	}

	async updatePages(bookId: number, userId: number, data: UpdatePagesDTO) {
		const current = await this.bookRepo.findBookById(bookId);
		if (!current) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (current.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		const updateData: any = { content: resolveContent(current.content, data.content) };
		if (data.title !== undefined) updateData.title = data.title;
		if (data.paperHeight !== undefined) updateData.paperHeight = data.paperHeight;
		if (data.paperWidth !== undefined) updateData.paperWidth = data.paperWidth;
		await this.bookRepo.updateBook(bookId, updateData);
	}
}
