import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

export interface SupplierDebt {
	id: number;
	name: string;
	totalDebt: number;
	thisMonth: number;
}

export interface CreateExpenseInput {
	amount: number;
	category: string;
	description?: string;
	date?: string;
	supplierName?: string;
	note?: string;
}

const EXPENSE_CATEGORIES = ['OPERATING', 'PAYROLL', 'MARKETING', 'DEBT', 'OTHER', 'SUPPLIER'];

export interface IFinanceService {
	getSummary(): Promise<{ summary: Record<string, number>; monthly: { period: string; revenue: number; orders: number }[] }>;
	getSuppliers(): Promise<SupplierDebt[]>;
	createExpense(input: CreateExpenseInput): Promise<any>;
	listIncome(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }>;
	listExpense(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }>;
	listCashflow(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }>;
}

export interface ListParams {
	cursor?: number;
	limit?: number;
	from?: string;
	to?: string;
	category?: string;
	type?: string;
}

@injectable()
export class FinanceService implements IFinanceService {
	async getSummary(): Promise<{ summary: Record<string, number>; monthly: { period: string; revenue: number; orders: number }[] }> {
		// ponytail: mọi chỉ số đã được trigger ghi vào FinancePeriod, chỉ SUM 1 truy vấn
		const agg = await prisma.financePeriod.aggregate({
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
		const s = agg._sum;
		const summary: Record<string, number> = {
			totalOrders: Number(s.totalOrders) || 0,
			totalRevenue: Number(s.totalRevenue) || 0,
			totalExpense: Number(s.totalExpense) || 0,
			totalSupplierExpense: Number(s.totalSupplierExpense) || 0,
			cashInflow: Number(s.cashInflow) || 0,
			cashOutflow: Number(s.cashOutflow) || 0,
			totalProfit: Number(s.totalProfit) || 0,
			cashOnHand: Number(s.cashOnHand) || 0,
			receivables: Number(s.receivables) || 0,
			payables: Number(s.payables) || 0,
		};

		const now = new Date();
		const keys: string[] = [];
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
		}
		const rows = await prisma.financePeriod.findMany({ orderBy: { period: 'desc' }, take: 12 });
		const byPeriod = new Map(rows.map((r) => [r.period, r]));
		const monthly = keys.map((k) => {
			const r = byPeriod.get(k);
			return {
				period: k,
				revenue: r ? Number(r.totalRevenue) || 0 : 0,
				orders: r ? Number(r.totalOrders) || 0 : 0,
			};
		});

		return { summary, monthly };
	}

	async getSuppliers(): Promise<SupplierDebt[]> {
		const termsDays = Number(process.env.PAYABLE_TERMS_DAYS ?? 14);
		const now = new Date();
		const orders = await prisma.order.findMany({ select: { orderItems: true, createdAt: true } });

		const map = new Map<number, { total: number; mtd: number }>();
		for (const o of orders) {
			const items: any[] = Array.isArray(o.orderItems) ? o.orderItems : [];
			for (const it of items) {
				if (it.supplierId == null || it.costPrice == null || it.reconciledAt) continue;
				const sid = Number(it.supplierId);
				const cur = map.get(sid) ?? { total: 0, mtd: 0 };
				const cost = Number(it.costPrice);
				cur.total += cost;
				const due = new Date(o.createdAt);
				due.setDate(due.getDate() + termsDays);
				if (due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth()) cur.mtd += cost;
				map.set(sid, cur);
			}
		}

		const suppliers = await prisma.supplier.findMany();
		return suppliers.map((s) => ({
			id: s.id,
			name: s.name,
			totalDebt: map.get(s.id)?.total ?? 0,
			thisMonth: map.get(s.id)?.mtd ?? 0,
		}));
	}

	async createExpense(input: CreateExpenseInput): Promise<any> {
		if (!input.amount || input.amount <= 0) throw new AppError(ErrorCode.INTERNAL, 400);
		if (!EXPENSE_CATEGORIES.includes(input.category)) throw new AppError(ErrorCode.INTERNAL, 400);
		return prisma.expense.create({
			data: {
				amount: input.amount,
				category: input.category as any,
				description: input.description,
				date: input.date ? new Date(input.date) : new Date(),
				supplierName: input.supplierName,
				note: input.note,
			},
		});
	}

	private dateRange(from?: string, to?: string) {
		if (!from && !to) return undefined;
		const r: any = {};
		if (from) r.gte = new Date(from);
		if (to) r.lte = new Date(to + "T23:59:59.999Z");
		return r;
	}

	async listIncome(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }> {
		const where: any = {};
		const range = this.dateRange(p.from, p.to);
		if (range) where.receivedAt = range;
		return this.paginate(() => prisma.income.findMany({ where, orderBy: { id: "desc" }, take: p.limit ?? 20, ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}) }), p.limit);
	}

	async listExpense(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }> {
		const where: any = {};
		const range = this.dateRange(p.from, p.to);
		if (range) where.date = range;
		if (p.category) where.category = p.category;
		return this.paginate(() => prisma.expense.findMany({ where, orderBy: { id: "desc" }, take: p.limit ?? 20, ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}) }), p.limit);
	}

	async listCashflow(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }> {
		const where: any = {};
		const range = this.dateRange(p.from, p.to);
		if (range) where.date = range;
		if (p.type) where.type = p.type;
		return this.paginate(() => prisma.cashflow.findMany({ where, orderBy: { id: "desc" }, take: p.limit ?? 20, ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}) }), p.limit);
	}

	private async paginate(find: () => Promise<any[]>, limit?: number): Promise<{ items: any[]; nextCursor: number | null }> {
		const items = await find();
		const taken = limit ?? 20;
		const nextCursor = items.length === taken ? items[items.length - 1].id : null;
		return { items, nextCursor };
	}
}
