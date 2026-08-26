
// Loại TỪNG lần giao dịch (1 đơn FULL có 1 giao dịch, đơn HALF có 2: cọc + phần còn lại).
export const TransactionType = {
  DEPOSIT: 'deposit',
  REMAINING_PAYMENT: 'remaining_payment',
  FULL_PAYMENT: 'full_payment',
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const PaymentPlan = {
  FULL: 'full-payment',
  HALF: 'half-payment',
} as const;

export type PaymentPlan = typeof PaymentPlan[keyof typeof PaymentPlan];



export const PaymentGateway = {
  PAYOS: 'PAYOS',
  SEPAY: 'SEPAY',
} as const;

export type PaymentGateway = typeof PaymentGateway[keyof typeof PaymentGateway];



export const TransactionStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

