import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@injectable()
export class BookRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	findBookById(id: number) {
		return this.client.book.findUnique({ where: { id } });
	}

	findBookOwner(id: number) {
		return this.client.book.findUnique({ where: { id }, select: { id: true, userId: true } });
	}

	findBooksByIds(ids: number[]) {
		if (!ids.length) return Promise.resolve([]);
		return this.client.book.findMany({ where: { id: { in: [...new Set(ids)] } } });
	}

	listBooksByUser(userId: number) {
		return this.client.book.findMany({ where: { userId }, orderBy: { id: 'desc' } });
	}

	createBook(data: Prisma.BookCreateInput) {
		return this.client.book.create({ data });
	}

	deleteBook(id: number) {
		return this.client.book.delete({ where: { id } });
	}

	updateBook(id: number, data: Record<string, unknown>, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).book.update({ where: { id }, data: data as Prisma.BookUpdateInput });
	}
}
