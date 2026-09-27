import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { TransactionStatus, IdempotencyKeyType, OrderStatus } from '@echotrace/shared';

// Service chỉ biết OrderRepository; mỗi method nhận tx? (transaction client) để gộp chung $transaction.
@injectable()
export class OrderRepository {
	constructor(@inject('PrismaService') private prisma: PrismaService) {}

	get client() {
		return this.prisma.db;
	}

	// --- idempotency ---
	getIdempotencyKey(key: string, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).idempotencyKey.findUnique({ where: { key } });
	}
	deleteIdempotencyKey(key: string, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).idempotencyKey.delete({ where: { key } });
	}
	createIdempotencyKey(key: string, status: IdempotencyKeyType, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).idempotencyKey.create({ data: { key, status } });
	}
	markIdempotencySuccess(key: string, responseBody: unknown, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).idempotencyKey.update({
			where: { key },
			data: { status: IdempotencyKeyType.SUCCESS, responseBody: responseBody as Prisma.InputJsonValue },
		});
	}
	markIdempotencyFailed(key: string, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).idempotencyKey.update({ where: { key }, data: { status: IdempotencyKeyType.FAILED } });
	}

	// --- user contact snapshot ---
	getUserContact(userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).user.findUnique({ where: { id: userId }, select: { name: true, email: true, phone: true, address: true } });
	}

	findBooksAttribution(bookIds: number[], tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).book.findMany({
			where: { id: { in: bookIds } },
			select: { id: true, utmSource: true, utmMedium: true, utmCampaign: true },
		});
	}

	// --- sample book stock ---
	findSampleBooks(ids: number[], tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.findMany({ where: { id: { in: ids } }, select: { id: true, quantity: true } });
	}
	updateSampleBookQuantity(id: number, need: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.updateMany({ where: { id, quantity: { gte: need } }, data: { quantity: { decrement: need } } });
	}

	// --- order ---
	findOrderById(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.findUnique({ where: { id } });
	}
	findOrderForUser(id: number, userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.findFirst({ where: { id, userId } });
	}
	findOrderWithTransactions(id: number, userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.findFirst({ where: { id, userId }, include: { transactions: { orderBy: { id: 'desc' }, take: 1 } } });
	}
	findOrderStatus(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.findUnique({ where: { id }, select: { status: true } });
	}
	listMyOrders(userId: number) {
		return this.client.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 });
	}
	listAllOrders() {
		return this.client.order.findMany({
			where: {},
			orderBy: { createdAt: 'desc' },
			take: 500,
			include: { user: { select: { id: true, name: true, email: true } }, supplier: { select: { id: true, name: true, contact: true, email: true } } },
		});
	}
	getOrderById(id: number) {
		return this.client.order.findUnique({
			where: { id },
			include: { user: { select: { id: true, name: true, email: true } }, supplier: { select: { id: true, name: true, contact: true, email: true } } },
		});
	}
	createOrder(data: Prisma.OrderUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.create({ data });
	}

	// --- marketing summary (groupBy trực tiếp, 2 admin nên không cache) ---
	// tính vào là bẩn số marketing
	summarizeOrdersBySource(from: Date, to: Date) {
		return this.client.order.groupBy({
			by: ['utmSource'],
			where: {
				createdAt: { gte: from, lt: to },
				status: { notIn: ['pending_payment', 'cancelled', 'refunded', 'pending_refund'] },
				user: { role: 'user', isDelete: false },
			},
			_count: { _all: true },
			_sum: { totalAmount: true, paidAmount: true },
		});
	}
	countBooksBySource(from: Date, to: Date) {
		return this.client.book.groupBy({
			by: ['utmSource'],
			where: { createdAt: { gte: from, lt: to }, isDelete: false, user: { role: 'user', isDelete: false } },
			_count: { _all: true },
		});
	}
	updateOrder(id: number, data: Record<string, unknown>, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.update({ where: { id }, data: data as Prisma.OrderUpdateInput });
	}

	findForExpiry(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.findUnique({
			where: { id },
			select: { id: true, status: true, expiredAt: true, orderItems: true },
		});
	}
	markCancelled(orderId: number, tx?: Prisma.TransactionClient) {
		// Returns count=0 when another path (user cancel, webhook, cron) already flipped the status,
		// which lets the caller skip the restock and prevents double-increment of stock.
		return (tx ?? this.client).order.updateMany({
			where: { id: orderId, status: OrderStatus.PENDING_PAYMENT },
			data: { status: OrderStatus.CANCELLED },
		});
	}
	findExpiredForCancellation(lastId: number, limit: number) {
		return this.client.order.findMany({
			where: { id: { gt: lastId }, status: OrderStatus.PENDING_PAYMENT, expiredAt: { lt: new Date() } },
			select: { id: true },
			orderBy: { id: 'asc' },
			take: limit,
		});
	}

	// --- transaction ---
	createTransaction(data: Prisma.TransactionUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).transaction.create({ data });
	}
	markTransactionsRefunded(orderId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).transaction.updateMany({ where: { orderId, status: TransactionStatus.SUCCESS }, data: { status: TransactionStatus.REFUNDED } });
	}

	// --- cart ---
	deleteCartItems(userId: number, bookIds: number[], tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).cartItem.deleteMany({ where: { cart: { userId }, bookId: { in: bookIds } } });
	}

	// --- supplier ---
	findSuppliersByIds(ids: number[], tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).supplier.findMany({ where: { id: { in: ids } } });
	}

	// --- cashflow ---
	createCashflow(data: Prisma.CashflowUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).cashflow.create({ data });
	}
}
