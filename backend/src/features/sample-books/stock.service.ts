import { injectable } from 'tsyringe';
import { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { AppError } from '../../middleware/app.error.js';

export interface IStockService {
	sumNeedBySampleBook(
		bookIds: number[],
		items: { bookId: number; quantity?: number }[],
		db: Prisma.TransactionClient | PrismaClient,
	): Promise<Map<number, number>>;
	restockOrderAlbums(
		orderItems: unknown,
		db: Prisma.TransactionClient | PrismaClient,
	): Promise<void>;
}

@injectable()
export class StockService implements IStockService {
	async sumNeedBySampleBook(
		bookIds: number[],
		items: { bookId: number; quantity?: number }[],
		db: Prisma.TransactionClient | PrismaClient,
	): Promise<Map<number, number>> {
		const books = await db.book.findMany({
			where: { id: { in: bookIds } },
			select: { id: true, sampleBookId: true },
		});
		const need = new Map<number, number>();
		for (const b of books) {
			if (b.sampleBookId == null) continue;
			const qty = items.find((i) => i.bookId === b.id)?.quantity ?? 1;
			need.set(b.sampleBookId, (need.get(b.sampleBookId) ?? 0) + qty);
		}
		return need;
	}

	async restockOrderAlbums(
		orderItems: unknown,
		db: Prisma.TransactionClient | PrismaClient,
	): Promise<void> {
		if (!Array.isArray(orderItems) || orderItems.length === 0) return;
		const items = orderItems as { bookId?: number; quantity?: number }[];
		const bookIds = items.map((i) => i.bookId).filter((id): id is number => typeof id === 'number');
		if (bookIds.length === 0) return;
		const need = await this.sumNeedBySampleBook(bookIds, items as { bookId: number; quantity?: number }[], db);
		await Promise.all(
			[...need].map(([sid, q]) =>
				db.sampleBook.updateMany({ where: { id: sid, quantity: { not: null } }, data: { quantity: { increment: q } } }),
			),
		);
	}
}
