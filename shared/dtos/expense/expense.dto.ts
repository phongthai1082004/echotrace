export const ExpenseCategory = {
  OPERATING: 'OPERATING',
  PAYROLL: 'PAYROLL',
  MARKETING: 'MARKETING',
  DEBT: 'DEBT',
  OTHER: 'OTHER',
} as const;

export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

import { IsString, IsOptional, IsNumber, IsPositive, IsIn, IsDateString, IsObject } from 'class-validator';

// Matches finance.service validation (amount > 0, category whitelist).
// NOTE: SUPPLIER/DEFECTIVE are accepted here (system-written flows), not just the base enum.
export const EXPENSE_INPUT_CATEGORIES = [
	'OPERATING',
	'PAYROLL',
	'MARKETING',
	'DEBT',
	'OTHER',
	'SUPPLIER',
	'DEFECTIVE',
] as const;

export interface ExpenseDTO {
  id: number;
  transactionId: number;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  date: Date | string;
  supplierName: string | null;
  supplierInfo: Record<string, unknown>;
  taxCode: string | null;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class CreateExpenseDTO {
	@IsNumber()
	@IsPositive()
	amount!: number;

	@IsIn(EXPENSE_INPUT_CATEGORIES)
	category!: (typeof EXPENSE_INPUT_CATEGORIES)[number];

	@IsString()
	@IsOptional()
	description?: string | null;

	@IsDateString()
	@IsOptional()
	date?: string;

	@IsString()
	@IsOptional()
	supplierName?: string | null;

	@IsObject()
	@IsOptional()
	supplierInfo?: Record<string, unknown>;

	@IsString()
	@IsOptional()
	taxCode?: string | null;

	@IsString()
	@IsOptional()
	note?: string | null;
}

export interface UpdateExpenseDTO {
  amount?: number;
  category?: ExpenseCategory;
  description?: string | null;
  date?: Date | string;
  supplierName?: string | null;
  supplierInfo?: Record<string, unknown>;
  taxCode?: string | null;
  note?: string | null;
}

export class ExpenseMapper {
  static toDTO(e: any): ExpenseDTO {
    return {
      id: e.id,
      transactionId: e.transactionId,
      amount: e.amount,
      category: e.category,
      description: e.description ?? null,
      date: e.date,
      supplierName: e.supplierName ?? null,
      supplierInfo: e.supplierInfo ?? {},
      taxCode: e.taxCode ?? null,
      note: e.note ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  static toDTOList(list: any[]): ExpenseDTO[] {
    return list.map((x) => this.toDTO(x));
  }
}