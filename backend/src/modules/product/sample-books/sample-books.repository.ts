import { injectable, inject } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

// Mỗi method nhận tx? để tái dùng trong $transaction.
@injectable()
export class SampleBookRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}
	get client() {
		return this.prismaService.db;
	}

	findById(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.findUnique({ where: { id } });
	}
	findMany(
		where: Prisma.SampleBookWhereInput,
		orderBy: Prisma.SampleBookOrderByWithRelationInput,
		take: number,
		cursor?: number,
		tx?: Prisma.TransactionClient,
	) {
		return (tx ?? this.client).sampleBook.findMany({
			where,
			orderBy,
			take,
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
		});
	}
	findActiveByType(type: 'TEMPLATE' | 'ALBUM', statuses: string[], tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.findMany({
			where: { isDelete: false, isActive: true, status: { in: statuses }, type },
			orderBy: { id: 'desc' },
		});
	}
	findPublishedById(id: number, statuses: string[], tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.findFirst({
			where: { id, isDelete: false, isActive: true, status: { in: statuses } },
		});
	}
	create(data: Prisma.SampleBookUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.create({ data });
	}
	update(id: number, data: Record<string, unknown>, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.update({ where: { id }, data: data as Prisma.SampleBookUpdateInput });
	}
	archive(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.updateMany({ where: { id, isDelete: false }, data: { status: 'archive', isActive: false } });
	}
	// ponytail: xóa cứng khỏi DB; Book.sampleBookId FK là ON DELETE SET NULL nên không kẹt
	remove(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.delete({ where: { id } });
	}

	findForStock(id: number, quantity: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.findFirst({
			where: {
				id,
				isDelete: false,
				isActive: true,
				OR: [{ quantity: null }, { quantity: { gte: quantity } }],
			},
		});
	}
}
