export const OrderStatus = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const PaymentMethod = {
  FULL: 'full',
  DEPOSIT: 'deposit',
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

// TransactionStatus defined in payment.enum.ts (has EXPIRED) — reuse it to avoid a duplicate.
export { TransactionStatus } from './payment.enum.js';