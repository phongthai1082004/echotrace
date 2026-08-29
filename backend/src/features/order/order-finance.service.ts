import { injectable, inject } from 'tsyringe';
import { Prisma } from '../../../generated/prisma/client.js';
import { FinanceRepository } from '../finance/finance.repository.js';

export interface IOrderFinanceService {
	recordOutflow(
		tx: Prisma.TransactionClient,
		orderId: number,
		amount: number,
		category: string,
		note: string,
		supplierName?: string,
	): Promise<void>;
	recognizeIncome(orderId: number, amount: number, tx?: Prisma.TransactionClient): Promise<void>;
}

@injectable()
export class OrderFinanceService implements IOrderFinanceService {
	constructor(@inject('FinanceRepository') private readonly financeRepo: FinanceRepository) {}

	// ponytail: single place for Expense + Cashflow OUT writes (NCC/hoàn tiền/bảo hành).
	async recordOutflow(
		tx: Prisma.TransactionClient,
		orderId: number,
		amount: number,
		category: string,
		note: string,
		supplierName?: string,
	): Promise<void> {
		if (amount <= 0) return;
		const expense = await tx.expense.create({
			data: { orderId, amount, category: category as any, date: new Date(), note, supplierName: supplierName ?? null },
		});
		await tx.cashflow.create({
			data: { type: 'OUT', expenseId: expense.id, orderId, amount, date: new Date(), note },
		});
	}

	async recognizeIncome(orderId: number, amount: number, tx?: Prisma.TransactionClient): Promise<void> {
		const db = tx ?? this.financeRepo.client;
		const existing = await db.income.findFirst({ where: { orderId } });
		if (existing) return; // idempotent
		await db.income.create({
			data: { orderId, amount, receivedAt: new Date(), note: 'Doanh thu (giao hàng hoàn tất)' },
		});
	}
}
