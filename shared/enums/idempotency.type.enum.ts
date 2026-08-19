export const IdempotencyKeyType = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PROCESSING: 'PROCESSING',
} as const;

export type IdempotencyKeyType = typeof IdempotencyKeyType[keyof typeof IdempotencyKeyType];