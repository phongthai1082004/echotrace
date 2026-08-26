import type { PaymentGateway, TransactionType, TransactionStatus } from '../../enums/payment.enum.js';

export type TransactionGateway = PaymentGateway | 'MANUAL' | 'CASH';
export type TransactionKind = TransactionType | 'EXPENSE';

export interface TransactionDTO {
  id: number;
  orderId: number | null;
  idempotencyKeyId: string | null;
  gateway: string;
  gatewayTransactionCode: string | null;
  type: string;
  amount: number;
  paymentLinkId: string | null;
  bankAccount: string | null;
  content: string | null;
  reference: string | null;
  status: string;
  transactionTime: Date | string;
  rawPayload: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateTransactionDTO {
  orderId?: number | null;
  idempotencyKeyId?: string | null;
  gateway: TransactionGateway;
  gatewayTransactionCode?: string | null;
  type?: TransactionKind;
  amount: number;
  paymentLinkId?: string | null;
  bankAccount?: string | null;
  content?: string | null;
  reference?: string | null;
  status: TransactionStatus;
  transactionTime?: Date | string;
  rawPayload?: unknown;
}

export interface UpdateTransactionDTO {
  orderId?: number | null;
  gatewayTransactionCode?: string | null;
  type?: TransactionKind;
  paymentLinkId?: string | null;
  bankAccount?: string | null;
  content?: string | null;
  reference?: string | null;
  status?: TransactionStatus;
  rawPayload?: unknown;
}

export class TransactionMapper {
  static toDTO(t: any): TransactionDTO {
    return {
      id: t.id,
      orderId: t.orderId ?? null,
      idempotencyKeyId: t.idempotencyKeyId ?? null,
      gateway: t.gateway,
      gatewayTransactionCode: t.gatewayTransactionCode ?? null,
      type: t.type ?? 'FULL_PAYMENT',
      amount: t.amount,
      paymentLinkId: t.paymentLinkId ?? null,
      bankAccount: t.bankAccount ?? null,
      content: t.content ?? null,
      reference: t.reference ?? null,
      status: t.status,
      transactionTime: t.transactionTime,
      rawPayload: t.rawPayload ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  static toDTOList(list: any[]): TransactionDTO[] {
    return list.map((x) => this.toDTO(x));
  }
}