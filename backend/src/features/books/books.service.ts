import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { BookDTO, CreateBookDTO, UpdatePagesDTO, BookMapper } from '@echotrace/shared';
import { resolveContent } from '../../lib/merge-book-content.js';

export abstract class IBookService {
	abstract getById(bookId: number, userId: number): Promise<BookDTO>;
	abstract getMyBooks(userId: number): Promise<BookDTO[]>;
	abstract create(userId: number, data: CreateBookDTO): Promise<BookDTO>;
	abstract delete(bookId: number, userId: number): Promise<void>;
	abstract updatePages(bookId: number, userId: number, data: UpdatePagesDTO): Promise<void>;
}

@injectable()
export class BookService extends IBookService {
	async getById(bookId: number, userId: number) {
		const book = await prisma.book.findUnique({ where: { id: bookId } });
		if (!book) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (book.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		return BookMapper.toDTO(book);
	}

	async getMyBooks(userId: number) {
		const books = await prisma.book.findMany({
			where: { userId },
			orderBy: { id: 'desc' },
		});
		return BookMapper.toDTOList(books);
	}

	async create(userId: number, data: CreateBookDTO) {
		const book = await prisma.book.create({
			data: {
				user: { connect: { id: userId } },
				type: 'TRAVEL',
				title: data.title || 'Untitled',
				style: 'PHOTOBOOK',
				font: 'Inter',
				cover: 'softcover',
				paperHeight: data.paperHeight ?? null,
				paperWidth: data.paperWidth ?? null,
				content: data.content ?? null,
			},
		});
		return BookMapper.toDTO(book);
	}

	async delete(bookId: number, userId: number) {
		const book = await prisma.book.findUnique({ where: { id: bookId } });
		if (!book) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (book.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		await prisma.book.delete({ where: { id: bookId } });
	}

	async updatePages(bookId: number, userId: number, data: UpdatePagesDTO) {
		const current = await prisma.book.findUnique({ where: { id: bookId } });
		if (!current) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (current.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		const updateData: any = { content: resolveContent(current.content, data.content) };
		if (data.title !== undefined) updateData.title = data.title;
		if (data.paperHeight !== undefined) updateData.paperHeight = data.paperHeight;
		if (data.paperWidth !== undefined) updateData.paperWidth = data.paperWidth;
		await prisma.book.update({
			where: { id: bookId },
			data: updateData,
		});
	}
}
