import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

export interface QueuedDelta {
	id: number;
	bookId: number;
	pageIndex: number;
	payload: any;
	createdAt: Date;
}

@injectable()
export class BookPageDeltaRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	queueDeltas(bookId: number, entries: { pageIndex: number; payload: unknown }[], tx?: Prisma.TransactionClient) {
		if (!entries.length) return Promise.resolve({ count: 0 });
		return (tx ?? this.client).bookPageDelta.createMany({
			data: entries.map((e) => ({ bookId, pageIndex: e.pageIndex, payload: e.payload as any })),
		});
	}

	listPending(bookId: number, tx?: Prisma.TransactionClient): Promise<QueuedDelta[]> {
		return (tx ?? this.client).bookPageDelta.findMany({
			where: { bookId },
			orderBy: { id: 'asc' },
		}) as Promise<QueuedDelta[]>;
	}

	listPendingForBooks(bookIds: number[], tx?: Prisma.TransactionClient): Promise<QueuedDelta[]> {
		if (!bookIds.length) return Promise.resolve([]);
		return (tx ?? this.client).bookPageDelta.findMany({
			where: { bookId: { in: [...new Set(bookIds)] } },
			orderBy: { id: 'asc' },
		}) as Promise<QueuedDelta[]>;
	}

	newestPendingAt(bookId: number): Promise<Date | null> {
		return this.client.bookPageDelta
			.findFirst({ where: { bookId }, orderBy: { id: 'desc' }, select: { createdAt: true } })
			.then((r) => r?.createdAt ?? null);
	}

	countPending(bookId: number): Promise<number> {
		return this.client.bookPageDelta.count({ where: { bookId } });
	}

	deleteByIds(ids: number[], tx?: Prisma.TransactionClient) {
		if (!ids.length) return Promise.resolve({ count: 0 });
		return (tx ?? this.client).bookPageDelta.deleteMany({ where: { id: { in: ids } } });
	}

	pendingBookIds(limit = 500): Promise<{ bookId: number }[]> {
		return this.client.bookPageDelta.findMany({
			select: { bookId: true },
			distinct: ['bookId'],
			take: limit,
		});
	}
}
