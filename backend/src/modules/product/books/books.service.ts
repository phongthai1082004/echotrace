import { injectable, inject } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { BookDTO, CreateBookDTO, UpdatePagesDTO, BookMapper } from '@echotrace/shared';
import { resolveContent } from '../catalog/merge-book-content.js';
import { scheduleDelayedJob, FLUSH_IDLE_MS, FLUSH_MAX_PENDING } from '../../order-cart/queue/redis-delayed-queue.js';
import { BookRepository } from './books.repository.js';
import { BookPageDeltaRepository } from './book-delta.repository.js';

export interface IBookService {
	getById(bookId: number, userId: number): Promise<BookDTO>;
	getMyBooks(userId: number): Promise<BookDTO[]>;
	create(userId: number, data: CreateBookDTO, attribution?: unknown): Promise<BookDTO>;
	delete(bookId: number, userId: number): Promise<void>;
	updatePages(bookId: number, userId: number, data: UpdatePagesDTO, opts?: { flush?: boolean }): Promise<void>;
	flushBook(bookId: number): Promise<{ flushed: number }>;
	flushBooks(bookIds: number[]): Promise<{ flushed: number }>;
	flushAllPending(): Promise<{ flushed: number }>;
	withPending<T extends { id: number; content: any }>(book: T): Promise<T>;
	withPendingList<T extends { id: number; content: any }>(books: T[]): Promise<T[]>;
}

@injectable()
export class BookService implements IBookService {
	constructor(
		@inject('BookRepository') private bookRepo: BookRepository,
		@inject('BookPageDeltaRepository') private deltaRepo: BookPageDeltaRepository,
	) {}

	async getById(bookId: number, userId: number) {
		const book = await this.bookRepo.findBookById(bookId);
		if (!book) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (book.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		return BookMapper.toDTO(await this.withPending(book));
	}

	async getMyBooks(userId: number) {
		const books = await this.bookRepo.listBooksByUser(userId);
		return BookMapper.toDTOList(await this.withPendingList(books));
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

	async updatePages(bookId: number, userId: number, data: UpdatePagesDTO, opts?: { flush?: boolean }) {
		const owner = await this.bookRepo.findBookOwner(bookId);
		if (!owner) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
		if (owner.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
		const updateData: any = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.paperHeight !== undefined) updateData.paperHeight = data.paperHeight;
		if (data.paperWidth !== undefined) updateData.paperWidth = data.paperWidth;
		const changed = Array.isArray((data.content as any)?.changedPages) ? (data.content as any).changedPages : null;
		if (changed?.length) {
			// đường nóng: chỉ INSERT delta vài KB, không đọc cục content.
			await this.deltaRepo.queueDeltas(
				bookId,
				changed.map((p: any) => ({ pageIndex: p.index, payload: p })),
			);
			scheduleDelayedJob('book_flush', { bookId }, FLUSH_IDLE_MS);
			const pending = await this.deltaRepo.countPending(bookId);
			if (opts?.flush || pending >= FLUSH_MAX_PENDING) await this.flushBook(bookId);
		} else if (data.content) {
			// đường hiếm (full pages): ghi thẳng như cũ.
			const current = await this.bookRepo.findBookById(bookId);
			updateData.content = resolveContent(current?.content, data.content);
		}
		if (Object.keys(updateData).length) await this.bookRepo.updateBook(bookId, updateData);
	}

	// Gộp toàn bộ delta treo vào content. Idempotent: 2 flush trùng nhau cho cùng kết quả.
	async flushBook(bookId: number): Promise<{ flushed: number }> {
		const rows = await this.deltaRepo.listPending(bookId);
		if (!rows.length) return { flushed: 0 };
		const ids = rows.map((r) => r.id);
		return this.bookRepo.client.$transaction(async (tx) => {
			const base = await tx.book.findUnique({ where: { id: bookId } });
			if (!base) {
				await tx.bookPageDelta.deleteMany({ where: { id: { in: ids } } });
				return { flushed: 0 };
			}
			const merged = resolveContent(base.content, { changedPages: rows.map((r) => r.payload) });
			await tx.book.update({ where: { id: bookId }, data: { content: merged } });
			await tx.bookPageDelta.deleteMany({ where: { id: { in: ids } } });
			return { flushed: rows.length };
		});
	}

	async flushBooks(bookIds: number[]): Promise<{ flushed: number }> {
		let flushed = 0;
		for (const id of [...new Set(bookIds)].filter((n) => Number.isFinite(n))) {
			flushed += (await this.flushBook(id)).flushed;
		}
		return { flushed };
	}

	// Worker gọi: delta còn tươi thì hẹn lại, đủ cũ mới flush.
	async flushBookIfStale(bookId: number): Promise<{ flushed: number }> {
		const newest = await this.deltaRepo.newestPendingAt(bookId);
		if (!newest) return { flushed: 0 };
		const age = Date.now() - newest.getTime();
		if (age < FLUSH_IDLE_MS) {
			scheduleDelayedJob('book_flush', { bookId }, FLUSH_IDLE_MS - age);
			return { flushed: 0 };
		}
		return this.flushBook(bookId);
	}

	async flushAllPending(): Promise<{ flushed: number }> {
		const ids = (await this.deltaRepo.pendingBookIds(1000)).map((r) => r.bookId);
		return this.flushBooks(ids);
	}

	// Read-through: đắp delta treo vào content trong bộ nhớ (không ghi DB).
	async withPending<T extends { id: number; content: any }>(book: T): Promise<T> {
		const rows = await this.deltaRepo.listPending(book.id);
		if (!rows.length) return book;
		return { ...book, content: resolveContent(book.content, { changedPages: rows.map((r) => r.payload) }) };
	}

	async withPendingList<T extends { id: number; content: any }>(books: T[]): Promise<T[]> {
		if (!books.length) return books;
		const all = await this.deltaRepo.listPendingForBooks(books.map((b) => b.id));
		if (!all.length) return books;
		const byBook = new Map<number, typeof all>();
		for (const r of all) {
			const list = byBook.get(r.bookId) ?? [];
			list.push(r);
			byBook.set(r.bookId, list);
		}
		return books.map((b) => {
			const rows = byBook.get(b.id);
			return rows?.length ? { ...b, content: resolveContent(b.content, { changedPages: rows.map((r) => r.payload) }) } : b;
		});
	}
}
