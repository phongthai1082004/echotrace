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

// ponytail: lifecycle đổi trả/bảo hành. none = không có yêu cầu.
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

// ponytail: lỗi do mình (self) => phải reconcile/ghi expense; lỗi nhà in (supplier) => không trả tiền, bỏ qua expense.
export const ReturnFault = {
  SELF: 'self',
  SUPPLIER: 'supplier',
} as const;

export type ReturnFault = typeof ReturnFault[keyof typeof ReturnFault];

// ponytail: hàng lỗi chỉ là 1 state (không phải status chính). none = bình thường.
export const DefectState = {
  NONE: 'none',
  REPORTED: 'reported',
  RESOLVED: 'resolved',
} as const;

export type DefectState = typeof DefectState[keyof typeof DefectState];

export { TransactionStatus, TransactionType, PaymentPlan } from './payment.enum.js';