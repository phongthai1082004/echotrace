export const CashflowType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type CashflowType = typeof CashflowType[keyof typeof CashflowType];

export interface CashflowDTO {
  id: number;
  type: CashflowType;
  incomeId: number | null;
  expenseId: number | null;
  amount: number;
  date: Date | string;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCashflowDTO {
  type: CashflowType;
  incomeId?: number | null;
  expenseId?: number | null;
  amount: number;
  date?: Date | string;
  note?: string | null;
}

export interface UpdateCashflowDTO {
  amount?: number;
  date?: Date | string;
  note?: string | null;
}

export class CashflowMapper {
  static toDTO(c: any): CashflowDTO {
    return {
      id: c.id,
      type: c.type,
      incomeId: c.incomeId ?? null,
      expenseId: c.expenseId ?? null,
      amount: c.amount,
      date: c.date,
      note: c.note ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  static toDTOList(list: any[]): CashflowDTO[] {
    return list.map((x) => this.toDTO(x));
  }
}