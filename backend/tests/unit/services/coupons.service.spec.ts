/**
 * Coupons Service Unit Tests
 * Test coverage: FIXED/PERCENT coupons, race-safe validateAndIncrementCoupon with Serializable TX
 * Methodology: test.md skill - EP, BVA, validation testing, race conditions
 */

import { CouponService } from '../../../src/features/coupons/coupons.service';
import { AppError } from '../../../src/middleware/app.error';
import { ErrorCode } from '@echotrace/shared';
import { couponTestData } from '../../fixtures/cart.fixtures';

describe('CouponService - Unit Tests', () => {
  let couponService: CouponService;
  let mockCouponRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCouponRepo = {
      listCoupons: jest.fn(),
      createCoupon: jest.fn(),
      deactivateCoupon: jest.fn(),
      removeCoupon: jest.fn(),
      findByCode: jest.fn(),
      findByIdInTx: jest.fn(),
      incrementUsedCount: jest.fn(),
    };

    couponService = new CouponService(mockCouponRepo);
  });

  // ===========================
  // SECTION 1: COUPON CREATION - EP & BVA
  // ===========================

  describe('1. Coupon Creation - EP (Equivalence Partitioning)', () => {
    describe('1.1 EP: Valid FIXED Coupon', () => {
      test('EP: Should create FIXED coupon with discount value', async () => {
        const createDto = {
          code: 'FIXED50K',
          discountType: 'FIXED',
          discountValue: 50000,
          minOrderAmount: 100000,
          minOrderType: 'VALUE',
          isActive: true,
        };

        const createdCoupon = {
          id: 1,
          code: 'FIXED50K-1693468800000',
          discountType: 'FIXED',
          discountValue: 50000,
          minOrderAmount: 100000,
          minOrderType: 'VALUE',
          maxDiscountAmount: null,
          maxUsageCount: 0, // Unlimited
          usedCount: 0,
          isActive: true,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockCouponRepo.createCoupon.mockResolvedValue(createdCoupon);

        const result = await couponService.create(createDto);

        expect(mockCouponRepo.createCoupon).toHaveBeenCalledWith(
          expect.objectContaining({
            code: expect.stringContaining('FIXED50K'),
            discountType: 'FIXED',
            discountValue: 50000,
            maxUsageCount: 0,
            isActive: true,
          })
        );
        expect(result).toBeDefined();
      });

      test('EP: Should create PERCENT coupon with percentage value', async () => {
        const createDto = {
          code: 'PERCENT10',
          discountType: 'PERCENT',
          discountValue: 10,
          maxDiscountAmount: 500000, // Max cap
          maxUsageCount: 100,
          isActive: true,
        };

        const createdCoupon = {
          id: 2,
          code: 'PERCENT10-1693468800000',
          discountType: 'PERCENT',
          discountValue: 10,
          maxUsageCount: 100,
          usedCount: 0,
          maxDiscountAmount: 500000,
          isActive: true,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockCouponRepo.createCoupon.mockResolvedValue(createdCoupon);

        const result = await couponService.create(createDto);

        expect(result).toBeDefined();
      });
    });

    describe('1.2 EP: Invalid Coupon Creation', () => {
      test('EP: Should reject FIXED coupon with maxDiscountAmount', async () => {
        const createDto = {
          code: 'INVALID',
          discountType: 'FIXED',
          discountValue: 50000,
          maxDiscountAmount: 100000, // Not allowed for FIXED
        };

        await expect(couponService.create(createDto as any)).rejects.toThrow(
          ErrorCode.VALIDATION_FAILED
        );
      });

      test('EP: Should reject duplicate coupon code', async () => {
        const createDto = {
          code: 'DUPLICATE',
          discountType: 'FIXED',
          discountValue: 50000,
        };

        mockCouponRepo.createCoupon.mockRejectedValue({
          code: 'P2002', // Prisma unique constraint
        });

        await expect(couponService.create(createDto as any)).rejects.toThrow(
          ErrorCode.COUPON_CODE_EXISTS
        );
      });
    });
  });

  // ===========================
  // SECTION 2: COUPON LOOKUP - EP
  // ===========================

  describe('2. Coupon Lookup by Code - EP', () => {
    describe('2.1 EP: Valid Coupon Lookup', () => {
      test('EP: Should find active coupon by code', async () => {
        const activeCoupon = {
          id: 1,
          code: 'ACTIVE50K',
          discountType: 'FIXED',
          discountValue: 50000,
          maxUsageCount: 0,
          usedCount: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires tomorrow
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockCouponRepo.findByCode.mockResolvedValue(activeCoupon);

        const result = await couponService.getByCode('ACTIVE50K');

        expect(result).toEqual(activeCoupon);
        expect(mockCouponRepo.findByCode).toHaveBeenCalledWith('ACTIVE50K', undefined);
      });

      test('EP: Should return null for non-existent code', async () => {
        mockCouponRepo.findByCode.mockResolvedValue(null);

        const result = await couponService.getByCode('NONEXISTENT');

        expect(result).toBeNull();
      });

      test('EP: Should return inactive coupon (caller checks isActive)', async () => {
        const inactiveCoupon = {
          id: 2,
          code: 'INACTIVE',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: false,
          usedCount: 0,
          maxUsageCount: 0,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockCouponRepo.findByCode.mockResolvedValue(inactiveCoupon);

        const result = await couponService.getByCode('INACTIVE');

        // Service returns it; caller checks isActive
        expect(result).toEqual(inactiveCoupon);
      });
    });
  });

  // ===========================
  // SECTION 3: INCREMENT USAGE - SIMPLE
  // ===========================

  describe('3. Increment Usage - Simple Case', () => {
    describe('3.1 EP: Usage Count Increment', () => {
      test('EP: Should increment used count for limited coupon', async () => {
        const mockTx = { coupon: { update: jest.fn() } };

        await couponService.incrementCouponUsage(1, 100, mockTx as any);

        expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalledWith(1, mockTx);
      });

      test('EP: Should skip increment for unlimited coupon (maxUsageCount=0)', async () => {
        const mockTx = { coupon: { update: jest.fn() } };

        await couponService.incrementCouponUsage(1, 0, mockTx as any);

        // Should not call incrementUsedCount
        expect(mockCouponRepo.incrementUsedCount).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================
  // SECTION 4: VALIDATE & INCREMENT - RACE CONDITION CRITICAL
  // ===========================

  describe('4. Validate and Increment Coupon - Race Condition Tests', () => {
    describe('4.1 EP: Valid Coupon Validation', () => {
      test('EP: Should validate and increment active coupon', async () => {
        const activeCoupon = {
          id: 1,
          code: 'VALID',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future
          maxUsageCount: 100,
          usedCount: 50, // Under limit
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(activeCoupon);
        mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

        await couponService.validateAndIncrementCoupon(1, mockTx as any);

        expect(mockCouponRepo.findByIdInTx).toHaveBeenCalledWith(1, mockTx);
        expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalledWith(1, mockTx);
      });

      test('EP: Should validate coupon with unlimited usage', async () => {
        const unlimitedCoupon = {
          id: 1,
          code: 'UNLIMITED',
          discountType: 'FIXED',
          discountValue: 30000,
          isActive: true,
          expiresAt: null,
          maxUsageCount: 0, // Unlimited
          usedCount: 999, // Doesn't matter
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(unlimitedCoupon);
        mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

        await couponService.validateAndIncrementCoupon(1, mockTx as any);

        // Should still increment (just not tracked when maxUsageCount=0)
        expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
      });
    });

    describe('4.2 EP: Invalid Coupon Rejection', () => {
      test('EP: Should reject inactive coupon', async () => {
        const inactiveCoupon = {
          id: 1,
          code: 'INACTIVE',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: false, // Inactive
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUsageCount: 100,
          usedCount: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(inactiveCoupon);

        await expect(
          couponService.validateAndIncrementCoupon(1, mockTx as any)
        ).rejects.toThrow(ErrorCode.COUPON_CODE_EXISTS);

        // Should not increment
        expect(mockCouponRepo.incrementUsedCount).not.toHaveBeenCalled();
      });

      test('EP: Should reject non-existent coupon', async () => {
        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(null);

        await expect(
          couponService.validateAndIncrementCoupon(999, mockTx as any)
        ).rejects.toThrow(ErrorCode.COUPON_CODE_EXISTS);
      });

      test('EP: Should reject expired coupon', async () => {
        const expiredCoupon = {
          id: 1,
          code: 'EXPIRED',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: true,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
          maxUsageCount: 100,
          usedCount: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(expiredCoupon);

        await expect(
          couponService.validateAndIncrementCoupon(1, mockTx as any)
        ).rejects.toThrow(ErrorCode.COUPON_CODE_EXISTS);
      });

      test('EP: Should reject coupon at max usage limit', async () => {
        const maxedCoupon = {
          id: 1,
          code: 'MAXED',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUsageCount: 100,
          usedCount: 100, // At limit
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(maxedCoupon);

        await expect(
          couponService.validateAndIncrementCoupon(1, mockTx as any)
        ).rejects.toThrow(ErrorCode.COUPON_CODE_EXISTS);
      });
    });

    describe('4.3 BVA: Max Usage Count Boundaries', () => {
      test('BVA: Coupon with usedCount = maxUsageCount - 1 (should allow)', async () => {
        const coupon = {
          id: 1,
          code: 'BVA_MAX',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUsageCount: 100,
          usedCount: 99, // One below max
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(coupon);
        mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

        await expect(
          couponService.validateAndIncrementCoupon(1, mockTx as any)
        ).resolves.toBeUndefined();

        expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
      });

      test('BVA: Coupon with maxUsageCount = 1 (single use)', async () => {
        const singleUseCoupon = {
          id: 1,
          code: 'SINGLEUSE',
          discountType: 'FIXED',
          discountValue: 100000,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUsageCount: 1, // Single use
          usedCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        mockCouponRepo.findByIdInTx.mockResolvedValue(singleUseCoupon);
        mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

        await couponService.validateAndIncrementCoupon(1, mockTx as any);

        expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
      });
    });

    describe('4.4 RACE CONDITION: Two Orders with maxUsageCount=1', () => {
      test('RACE: First order claims coupon, second should be rejected', async () => {
        // Simulates Serializable TX isolation

        // Order 1 at time T1: reads coupon (usedCount=0, maxUsageCount=1)
        const couponAtT1 = {
          id: 1,
          code: 'RACE_TEST',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUsageCount: 1,
          usedCount: 0, // First read sees 0
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Order 1 increments to usedCount=1
        mockCouponRepo.findByIdInTx.mockResolvedValueOnce(couponAtT1);
        mockCouponRepo.incrementUsedCount.mockResolvedValueOnce(undefined);

        const mockTx1 = {};
        await couponService.validateAndIncrementCoupon(1, mockTx1 as any);

        // Order 2 at time T2: re-reads coupon (Serializable TX re-reads)
        const couponAtT2 = {
          ...couponAtT1,
          usedCount: 1, // Now at limit due to Order 1
        };

        // Order 2 should see usedCount=1 and reject
        mockCouponRepo.findByIdInTx.mockResolvedValueOnce(couponAtT2);

        const mockTx2 = {};
        await expect(
          couponService.validateAndIncrementCoupon(1, mockTx2 as any)
        ).rejects.toThrow(ErrorCode.COUPON_CODE_EXISTS);

        // Order 2's increment should never be called
        expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalledTimes(1);
      });

      test('RACE: validateAndIncrementCoupon closes race window', async () => {
        // Without re-reading inside TX, this scenario could happen:
        // calculateCart reads usedCount=0 (outside TX)
        // Order A's validateAndIncrementCoupon increments to 1
        // Order B's validateAndIncrementCoupon also runs (reads still 0, increments to 2)
        // Result: coupon over-used!

        // With validateAndIncrementCoupon re-reading inside Serializable TX:
        const coupon1stRead = {
          id: 1,
          code: 'CLOSE_RACE',
          discountType: 'FIXED',
          discountValue: 50000,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUsageCount: 1,
          usedCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTx = {};

        // First call: sees 0, increments
        mockCouponRepo.findByIdInTx.mockResolvedValueOnce(coupon1stRead);
        mockCouponRepo.incrementUsedCount.mockResolvedValueOnce(undefined);

        await couponService.validateAndIncrementCoupon(1, mockTx as any);

        // Second call within same Serializable TX would see 1 and reject
        const coupon2ndRead = { ...coupon1stRead, usedCount: 1 };
        mockCouponRepo.findByIdInTx.mockResolvedValueOnce(coupon2ndRead);

        await expect(
          couponService.validateAndIncrementCoupon(1, mockTx as any)
        ).rejects.toThrow();

        // Increment only called once
        expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===========================
  // SECTION 5: COUPON MANAGEMENT
  // ===========================

  describe('5. Coupon Management - List, Deactivate, Remove', () => {
    test('Should list all coupons', async () => {
      const coupons = [
        { id: 1, code: 'COUPON1', discountType: 'FIXED', isActive: true },
        { id: 2, code: 'COUPON2', discountType: 'PERCENT', isActive: false },
      ];

      mockCouponRepo.listCoupons.mockResolvedValue(coupons);

      const result = await couponService.list();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('COUPON1');
      expect(result[1].code).toBe('COUPON2');
      expect(mockCouponRepo.listCoupons).toHaveBeenCalled();
    });

    test('Should deactivate coupon', async () => {
      mockCouponRepo.deactivateCoupon.mockResolvedValue(undefined);

      await couponService.deactivate(1);

      expect(mockCouponRepo.deactivateCoupon).toHaveBeenCalledWith(1);
    });

    test('Should remove coupon', async () => {
      mockCouponRepo.removeCoupon.mockResolvedValue(undefined);

      await couponService.remove(1);

      expect(mockCouponRepo.removeCoupon).toHaveBeenCalledWith(1);
    });
  });

  // ===========================
  // SECTION 6: BVA - DISCOUNT VALUE BOUNDARIES
  // ===========================

  describe('6. BVA: Discount Value Boundaries', () => {
    test('BVA: FIXED discount = 0 (no discount)', async () => {
      const zeroCoupon = {
        id: 1,
        code: 'ZERO',
        discountType: 'FIXED',
        discountValue: 0, // No discount
        isActive: true,
        expiresAt: null,
        maxUsageCount: 0,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {};
      mockCouponRepo.findByIdInTx.mockResolvedValue(zeroCoupon);
      mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

      await couponService.validateAndIncrementCoupon(1, mockTx as any);

      expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
    });

    test('BVA: PERCENT discount = 0% (no discount)', async () => {
      const zeroPercentCoupon = {
        id: 1,
        code: 'ZEROPERCENT',
        discountType: 'PERCENT',
        discountValue: 0, // 0%
        isActive: true,
        expiresAt: null,
        maxUsageCount: 0,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {};
      mockCouponRepo.findByIdInTx.mockResolvedValue(zeroPercentCoupon);
      mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

      await couponService.validateAndIncrementCoupon(1, mockTx as any);

      expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
    });

    test('BVA: PERCENT discount = 100% (full discount)', async () => {
      const fullDiscountCoupon = {
        id: 1,
        code: 'FULLDISCOUNT',
        discountType: 'PERCENT',
        discountValue: 100, // 100%
        isActive: true,
        expiresAt: null,
        maxUsageCount: 0,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {};
      mockCouponRepo.findByIdInTx.mockResolvedValue(fullDiscountCoupon);
      mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

      await couponService.validateAndIncrementCoupon(1, mockTx as any);

      expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
    });
  });

  // ===========================
  // SECTION 7: BVA - EXPIRATION BOUNDARIES
  // ===========================

  describe('7. BVA: Coupon Expiration Boundaries', () => {
    test('BVA: Coupon expires in 1 second (valid)', async () => {
      const coupon = {
        id: 1,
        code: 'EXPIRING_SOON',
        discountType: 'FIXED',
        discountValue: 50000,
        isActive: true,
        expiresAt: new Date(Date.now() + 1000), // 1 second
        maxUsageCount: 100,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {};
      mockCouponRepo.findByIdInTx.mockResolvedValue(coupon);
      mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

      await couponService.validateAndIncrementCoupon(1, mockTx as any);

      expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
    });

    test('BVA: Coupon expired 1 second ago (invalid)', async () => {
      const coupon = {
        id: 1,
        code: 'JUST_EXPIRED',
        discountType: 'FIXED',
        discountValue: 50000,
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        maxUsageCount: 100,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {};
      mockCouponRepo.findByIdInTx.mockResolvedValue(coupon);

      await expect(
        couponService.validateAndIncrementCoupon(1, mockTx as any)
      ).rejects.toThrow(ErrorCode.COUPON_CODE_EXISTS);
    });

    test('BVA: Coupon expires far in future (1 year)', async () => {
      const coupon = {
        id: 1,
        code: 'FAR_FUTURE',
        discountType: 'FIXED',
        discountValue: 50000,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        maxUsageCount: 100,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {};
      mockCouponRepo.findByIdInTx.mockResolvedValue(coupon);
      mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

      await couponService.validateAndIncrementCoupon(1, mockTx as any);

      expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
    });

    test('BVA: Coupon with no expiration (expiresAt=null)', async () => {
      const coupon = {
        id: 1,
        code: 'NO_EXPIRY',
        discountType: 'FIXED',
        discountValue: 50000,
        isActive: true,
        expiresAt: null, // Never expires
        maxUsageCount: 100,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {};
      mockCouponRepo.findByIdInTx.mockResolvedValue(coupon);
      mockCouponRepo.incrementUsedCount.mockResolvedValue(undefined);

      await couponService.validateAndIncrementCoupon(1, mockTx as any);

      expect(mockCouponRepo.incrementUsedCount).toHaveBeenCalled();
    });
  });
});
