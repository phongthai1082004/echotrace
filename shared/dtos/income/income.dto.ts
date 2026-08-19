export interface IncomeDTO {
  id: number;
  transactionId: number;
  amount: number;
  receivedAt: Date | string;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateIncomeDTO {
  transactionId: number;
  amount: number;
  receivedAt?: Date | string;
  note?: string | null;
}

export interface UpdateIncomeDTO {
  amount?: number;
  receivedAt?: Date | string;
  note?: string | null;
}

export class IncomeMapper {
  static toDTO(i: any): IncomeDTO {
    return {
      id: i.id,
      transactionId: i.transactionId,
      amount: i.amount,
      receivedAt: i.receivedAt,
      note: i.note ?? null,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }

  static toDTOList(list: any[]): IncomeDTO[] {
    return list.map((x) => this.toDTO(x));
  }
}