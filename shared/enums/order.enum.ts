export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  FULL = 'full',
  DEPOSIT = 'deposit',
}

// TransactionStatus defined in payment.enum.ts (has EXPIRED) — reuse it to avoid a duplicate.
export { TransactionStatus } from './payment.enum.js';