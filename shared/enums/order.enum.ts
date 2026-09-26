export const OrderStatus = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  PROCESSING: 'processing',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  PENDING_REFUND: 'pending_refund',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const ReturnState = {
  NONE: 'none',
  REQUESTED: 'requested',
  APPROVED: 'approved',
  RESHIPPING: 'reshipping',
  RESHIPPED: 'reshipped',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
} as const;

export type ReturnState = typeof ReturnState[keyof typeof ReturnState];

export const ReturnFault = {
  SELF: 'self',
  SUPPLIER: 'supplier',
} as const;

export type ReturnFault = typeof ReturnFault[keyof typeof ReturnFault];

export const DefectState = {
  NONE: 'none',
  REPORTED: 'reported',
  RESOLVED: 'resolved',
} as const;

export type DefectState = typeof DefectState[keyof typeof DefectState];

export { TransactionStatus, TransactionType, PaymentPlan } from './payment.enum.js';