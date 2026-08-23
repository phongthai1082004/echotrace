// 1. PaymentType
export const PaymentType = {
  DEPOSIT: 'deposit',
  REMAINING_PAYMENT: 'remaining_payment',
  FULL_PAYMENT: 'full_payment',
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
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

export const PaymentDeposit = {
  FULL_PAYMENT: 'full_payment',
  HALF_PAYMENT: 'half_payment',
} as const;

export type PaymentDeposit = typeof PaymentDeposit[keyof typeof PaymentDeposit];

