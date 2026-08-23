export const DiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;

export type DiscountType = typeof DiscountType[keyof typeof DiscountType];

export const MinOrderType = {
  VALUE: 'value',
  QUANTITY: 'quantity',
} as const;

export type MinOrderType = typeof MinOrderType[keyof typeof MinOrderType];