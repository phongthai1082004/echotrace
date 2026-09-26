import { injectable, inject } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode, EXPENSE_INPUT_CATEGORIES } from '@echotrace/shared';
import { FinanceRepository } from './finance.repository.js';

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
	constructor(@inject('FinanceRepository') private readonly financeRepo: FinanceRepository) {}

	async getSummary(): Promise<{ summary: Record<string, number>; monthly: { period: string; revenue: number; orders: number }[] }> {
		const agg = await this.financeRepo.aggregateFinancePeriod();
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
		const rows = await this.financeRepo.listFinancePeriods();
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
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

		const result: any[] = await this.financeRepo.getSupplierDebtsRaw(termsDays, monthStart, monthEnd);

		return result.map((row: any) => ({
			id: Number(row.id),
			name: row.name,
			totalDebt: Number(row.totalDebt) || 0,
			thisMonth: Number(row.thisMonth) || 0,
		}));
	}

	async createExpense(input: CreateExpenseInput): Promise<any> {
		if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) throw new AppError(ErrorCode.INTERNAL, 400);
		if (!(EXPENSE_INPUT_CATEGORIES as readonly string[]).includes(input.category)) throw new AppError(ErrorCode.INTERNAL, 400);
		return this.financeRepo.createExpense({
			amount: input.amount,
			category: input.category as any,
			description: input.description,
			date: input.date ? new Date(input.date) : new Date(),
			supplierName: input.supplierName,
			note: input.note,
		});
	}

	private dateRange(from?: string, to?: string) {
		if (!from && !to) return undefined;
		const r: any = {};
		if (from) r.gte = new Date(from);
		if (to) r.lte = new Date(to + 'T23:59:59.999Z');
		return r;
	}

	async listIncome(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }> {
		const where: any = {};
		const range = this.dateRange(p.from, p.to);
		if (range) where.receivedAt = range;
		return this.paginate(() => this.financeRepo.listIncomes(where, p.limit), p.limit);
	}

	async listExpense(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }> {
		const where: any = {};
		const range = this.dateRange(p.from, p.to);
		if (range) where.date = range;
		if (p.category) where.category = p.category;
		return this.paginate(() => this.financeRepo.listExpenses(where, p.limit), p.limit);
	}

	async listCashflow(p: ListParams): Promise<{ items: any[]; nextCursor: number | null }> {
		const where: any = {};
		const range = this.dateRange(p.from, p.to);
		if (range) where.date = range;
		if (p.type) where.type = p.type;
		return this.paginate(() => this.financeRepo.listCashflows(where, p.limit), p.limit);
	}

	private async paginate(find: () => Promise<any[]>, limit?: number): Promise<{ items: any[]; nextCursor: number | null }> {
		const items = await find();
		const taken = limit ?? 20;
		const nextCursor = items.length === taken ? items[items.length - 1].id : null;
		return { items, nextCursor };
	}
}
