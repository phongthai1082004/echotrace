export const OrderStatus = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  PROCESSING: 'processing',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export { TransactionStatus, TransactionType, PaymentPlan } from './payment.enum.js';