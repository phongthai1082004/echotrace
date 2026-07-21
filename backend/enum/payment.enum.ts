// 1. PaymentType
export const PaymentType = {
  DEPOSIT: 'DEPOSIT',
  REMAINING_PAYMENT: 'REMAINING_PAYMENT',
  FULL_PAYMENT: 'FULL_PAYMENT',
} as const;

export type PaymentType = typeof PaymentType[keyof typeof PaymentType];


// 2. PaymentGateway
export const PaymentGateway = {
  PAYOS: 'PAYOS',
  SEPAY: 'SEPAY',
} as const;

export type PaymentGateway = typeof PaymentGateway[keyof typeof PaymentGateway];


// 3. TransactionStatus
export const TransactionStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

