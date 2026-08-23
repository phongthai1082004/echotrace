export interface CouponDTO {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  maxUsageCount: number;
  usedCount: number;
  minOrderType: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateCouponDTO {
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  minOrderType?: string;
  maxDiscountAmount?: number;
  maxUsageCount?: number;
  isActive?: boolean;
  expiresAt?: string;
}

export class CouponMapper {
  static toDTO(c: any): CouponDTO {
    return {
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      minOrderType: c.minOrderType,
      maxDiscountAmount: c.maxDiscountAmount,
      maxUsageCount: c.maxUsageCount,
      usedCount: c.usedCount,
      isActive: c.isActive,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt,
    };
  }
}
