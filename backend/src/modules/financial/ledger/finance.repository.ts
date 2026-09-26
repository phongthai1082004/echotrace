import { injectable, inject } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@injectable()
export class FinanceRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}
	get client() {
		return this.prismaService.db;
	}

	aggregateFinancePeriod() {
		return this.client.financePeriod.aggregate({
			_sum: {
				totalOrders: true,
				totalRevenue: true,
				totalExpense: true,
				totalSupplierExpense: true,
				cashInflow: true,
				cashOutflow: true,
				totalProfit: true,
				cashOnHand: true,
				receivables: true,
				payables: true,
			},
		});
	}
	listFinancePeriods() {
		return this.client.financePeriod.findMany({ orderBy: { period: 'desc' }, take: 12 });
	}
	getSupplierDebtsRaw(termsDays: number, monthStart: Date, monthEnd: Date): Promise<any[]> {
		return this.client.$queryRaw<any[]>`
			WITH item_debts AS (
				SELECT
					(it->>'supplierId')::int AS supplier_id,
					COALESCE((it->>'costPrice')::numeric, 0) AS cost,
					o."createdAt"
				FROM "Order" o,
				jsonb_array_elements(o."orderItems") it
				WHERE it->>'supplierId' IS NOT NULL
					AND it->>'costPrice' IS NOT NULL
					AND it->>'reconciledAt' IS NULL
			)
			SELECT
				s.id,
				s.name,
				COALESCE(SUM(id.cost), 0)::double precision AS totalDebt,
				COALESCE(SUM(CASE
					WHEN (id."createdAt" + (${termsDays} || ' days')::interval) >= ${monthStart}
						AND (id."createdAt" + (${termsDays} || ' days')::interval) < ${monthEnd}
					THEN id.cost ELSE 0
				END), 0)::double precision AS thisMonth
			FROM "Supplier" s
			LEFT JOIN item_debts id ON s.id = id.supplier_id
			GROUP BY s.id, s.name
			ORDER BY s.id;
		`;
	}
	createExpense(data: Prisma.ExpenseUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).expense.create({ data });
	}
	private listModel(model: 'income' | 'expense' | 'cashflow', where: any, limit: number, cursor?: number) {
		return (this.client as any)[model].findMany({
			where,
			orderBy: { id: 'desc' },
			take: limit ?? 20,
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
		});
	}
	listIncomes(where: any, limit?: number, cursor?: number) {
		return this.listModel('income', where, limit ?? 20, cursor);
	}
	listExpenses(where: any, limit?: number, cursor?: number) {
		return this.listModel('expense', where, limit ?? 20, cursor);
	}
	listCashflows(where: any, limit?: number, cursor?: number) {
		return this.listModel('cashflow', where, limit ?? 20, cursor);
	}
}
