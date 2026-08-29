import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../lib/db.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

// ponytail: repository layer — tách toàn bộ truy cập Prisma của feature uploads/user-images ra khỏi service.
// Service chỉ biết UserImagesRepository; mỗi method nhận tx? (transaction client) để gộp chung $transaction.
@injectable()
export class UserImagesRepository {
	constructor(@inject('PrismaService') private prisma: PrismaService) {}

	get client() {
		return this.prisma.db;
	}

	findByIdForUser(id: number, userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).userImage.findFirst({ where: { id, userId, isDelete: false } });
	}

	createUserImage(data: Prisma.UserImageUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).userImage.create({ data });
	}

	listByUser(userId: number, bookId?: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).userImage.findMany({
			where: { userId, isDelete: false, ...(bookId ? { bookId } : {}) },
			orderBy: { id: 'desc' },
		});
	}

	deleteUserImage(id: number, userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).userImage.updateMany({
			where: { id, userId, isDelete: false },
			data: { isDelete: true, deletedAt: new Date() },
		});
	}
}
