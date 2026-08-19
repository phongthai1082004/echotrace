export const DiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;

export type DiscountType = typeof DiscountType[keyof typeof DiscountType];