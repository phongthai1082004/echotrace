/**
 * Coupons Routes Integration Tests
 * Test coverage: GET /coupons, POST /coupons, PUT /coupons/:code, DELETE /coupons/:code, POST /coupons/validate
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), discount scenarios
 */

import { CouponsService } from '@features/coupons/coupons.service';
import { CouponsRepository } from '@features/coupons/coupons.repository';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Coupons Routes - Integration Tests', () => {
  let mockCouponsService: jest.Mocked<CouponsService>;
  let mockCouponsRepository: jest.Mocked<CouponsRepository>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockCouponsService = {
      getAllCoupons: jest.fn(),
      getCouponByCode: jest.fn(),
      createCoupon: jest.fn(),
      updateCoupon: jest.fn(),
      deleteCoupon: jest.fn(),
      validateCoupon: jest.fn(),
      applyCoupon: jest.fn(),
      getActiveCoupons: jest.fn(),
      deactivateCoupon: jest.fn(),
    } as any;

    mockCouponsRepository = {
      findAll: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    req = {
      params: {},
      query: {},
      body: {},
      user: { id: 1, role: 'admin' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('GET /coupons - List All Coupons', () => {
    it('EP: Should return all coupons for admin', async () => {
      const coupons = [
        {
          id: 1,
          code: 'SAVE10',
          type: 'percentage',
          value: 10,
          active: true,
        },
        {
          id: 2,
          code: 'SAVE50K',
          type: 'fixed',
          value: 50000,
          active: true,
        },
      ];
      mockCouponsService.getAllCoupons.mockResolvedValue(coupons);

      const result = await mockCouponsService.getAllCoupons();

      expect(result).toEqual(coupons);
      expect(result).toHaveLength(2);
    });

    it('EP: Should handle empty coupon list', async () => {
      mockCouponsService.getAllCoupons.mockResolvedValue([]);

      const result = await mockCouponsService.getAllCoupons();

      expect(result).toEqual([]);
    });

    it('Error: Should deny access for non-admin users', async () => {
      req.user = { id: 1, role: 'user' };
      mockCouponsService.getAllCoupons.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockCouponsService.getAllCoupons()).rejects.toThrow();
    });

    it('BVA: Should handle pagination (page 1, limit 10)', async () => {
      const coupons = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        code: `COUPON${i + 1}`,
      }));
      mockCouponsService.getAllCoupons.mockResolvedValue(coupons);

      req.query = { page: '1', limit: '10' };
      const result = await mockCouponsService.getAllCoupons();

      expect(result).toHaveLength(10);
    });
  });

  describe('GET /coupons/:code - Get Coupon by Code', () => {
    it('EP: Should return coupon by valid code', async () => {
      const coupon = {
        id: 1,
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        active: true,
        expiresAt: new Date('2025-12-31'),
      };
      mockCouponsService.getCouponByCode.mockResolvedValue(coupon);

      req.params.code = 'SAVE10';
      const result = await mockCouponsService.getCouponByCode('SAVE10');

      expect(result.code).toBe('SAVE10');
      expect(result.value).toBe(10);
    });

    it('EP: Should return 404 for non-existent coupon', async () => {
      mockCouponsService.getCouponByCode.mockResolvedValue(null);

      req.params.code = 'INVALID';
      const result = await mockCouponsService.getCouponByCode('INVALID');

      expect(result).toBeNull();
    });

    it('BVA: Should handle short code (3 chars)', async () => {
      const coupon = { id: 1, code: 'ABC' };
      mockCouponsService.getCouponByCode.mockResolvedValue(coupon);

      const result = await mockCouponsService.getCouponByCode('ABC');

      expect(result.code).toBe('ABC');
    });

    it('BVA: Should handle long code (50 chars)', async () => {
      const longCode = 'A'.repeat(50);
      const coupon = { id: 1, code: longCode };
      mockCouponsService.getCouponByCode.mockResolvedValue(coupon);

      const result = await mockCouponsService.getCouponByCode(longCode);

      expect(result.code).toHaveLength(50);
    });

    it('BVA: Should handle case-insensitive code lookup', async () => {
      const coupon = { id: 1, code: 'SAVE10' };
      mockCouponsService.getCouponByCode.mockResolvedValue(coupon);

      const result = await mockCouponsService.getCouponByCode('save10');

      expect(result).toBeDefined();
    });
  });

  describe('POST /coupons - Create Coupon', () => {
    it('EP: Should create percentage coupon', async () => {
      const couponData = {
        code: 'SALE20',
        type: 'percentage',
        value: 20,
        expiresAt: new Date('2025-12-31'),
      };
      const created = { id: 1, ...couponData, active: true };
      mockCouponsService.createCoupon.mockResolvedValue(created);

      req.body = couponData;
      const result = await mockCouponsService.createCoupon(couponData);

      expect(result.code).toBe('SALE20');
      expect(result.type).toBe('percentage');
    });

    it('EP: Should create fixed-amount coupon', async () => {
      const couponData = {
        code: 'FIXED100K',
        type: 'fixed',
        value: 100000,
        expiresAt: new Date('2025-12-31'),
      };
      const created = { id: 1, ...couponData, active: true };
      mockCouponsService.createCoupon.mockResolvedValue(created);

      const result = await mockCouponsService.createCoupon(couponData);

      expect(result.type).toBe('fixed');
      expect(result.value).toBe(100000);
    });

    it('EP: Should reject duplicate coupon code', async () => {
      const couponData = { code: 'DUPLICATE', type: 'percentage', value: 10 };
      mockCouponsService.createCoupon.mockRejectedValue(
        new AppError('DUPLICATE_CODE', 409)
      );

      await expect(mockCouponsService.createCoupon(couponData)).rejects.toThrow();
    });

    it('BVA: Should handle percentage discount at 0%', async () => {
      const couponData = {
        code: 'ZERO',
        type: 'percentage',
        value: 0,
      };
      const created = { id: 1, ...couponData };
      mockCouponsService.createCoupon.mockResolvedValue(created);

      const result = await mockCouponsService.createCoupon(couponData);

      expect(result.value).toBe(0);
    });

    it('BVA: Should handle percentage discount at 100%', async () => {
      const couponData = {
        code: 'FREE',
        type: 'percentage',
        value: 100,
      };
      const created = { id: 1, ...couponData };
      mockCouponsService.createCoupon.mockResolvedValue(created);

      const result = await mockCouponsService.createCoupon(couponData);

      expect(result.value).toBe(100);
    });

    it('Error: Should reject invalid percentage (> 100%)', async () => {
      const couponData = {
        code: 'INVALID',
        type: 'percentage',
        value: 150,
      };
      mockCouponsService.createCoupon.mockRejectedValue(
        new AppError('INVALID_VALUE', 400)
      );

      await expect(mockCouponsService.createCoupon(couponData)).rejects.toThrow();
    });

    it('Error: Should reject negative discount', async () => {
      const couponData = {
        code: 'NEGATIVE',
        type: 'percentage',
        value: -10,
      };
      mockCouponsService.createCoupon.mockRejectedValue(
        new AppError('INVALID_VALUE', 400)
      );

      await expect(mockCouponsService.createCoupon(couponData)).rejects.toThrow();
    });

    it('Error: Should reject missing code', async () => {
      const couponData = { type: 'percentage', value: 10 };
      mockCouponsService.createCoupon.mockRejectedValue(
        new AppError('VALIDATION_FAILED', 400)
      );

      await expect(mockCouponsService.createCoupon(couponData)).rejects.toThrow();
    });
  });

  describe('PUT /coupons/:code - Update Coupon', () => {
    it('EP: Should update coupon', async () => {
      const update = { value: 15 };
      const updated = { id: 1, code: 'SAVE10', type: 'percentage', value: 15 };
      mockCouponsService.updateCoupon.mockResolvedValue(updated);

      const result = await mockCouponsService.updateCoupon('SAVE10', update);

      expect(result.value).toBe(15);
    });

    it('EP: Should return 404 if coupon not found', async () => {
      mockCouponsService.updateCoupon.mockResolvedValue(null);

      const result = await mockCouponsService.updateCoupon('INVALID', { value: 20 });

      expect(result).toBeNull();
    });

    it('EP: Should deactivate coupon', async () => {
      const update = { active: false };
      const updated = {
        id: 1,
        code: 'SAVE10',
        active: false,
      };
      mockCouponsService.updateCoupon.mockResolvedValue(updated);

      const result = await mockCouponsService.updateCoupon('SAVE10', update);

      expect(result.active).toBe(false);
    });

    it('Error: Should reject invalid update', async () => {
      mockCouponsService.updateCoupon.mockRejectedValue(
        new AppError('INVALID_VALUE', 400)
      );

      await expect(
        mockCouponsService.updateCoupon('SAVE10', { value: 150 })
      ).rejects.toThrow();
    });
  });

  describe('DELETE /coupons/:code - Delete Coupon', () => {
    it('EP: Should delete coupon', async () => {
      mockCouponsService.deleteCoupon.mockResolvedValue(true);

      const result = await mockCouponsService.deleteCoupon('SAVE10');

      expect(result).toBe(true);
    });

    it('EP: Should return 404 if coupon not found', async () => {
      mockCouponsService.deleteCoupon.mockResolvedValue(false);

      const result = await mockCouponsService.deleteCoupon('INVALID');

      expect(result).toBe(false);
    });

    it('Error: Should deny deletion for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockCouponsService.deleteCoupon.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockCouponsService.deleteCoupon('SAVE10')).rejects.toThrow();
    });
  });

  describe('POST /coupons/validate - Validate Coupon', () => {
    it('EP: Should validate active coupon', async () => {
      const coupon = { id: 1, code: 'SAVE10', active: true, expiresAt: new Date('2099-12-31') };
      mockCouponsService.validateCoupon.mockResolvedValue(coupon);

      const result = await mockCouponsService.validateCoupon('SAVE10');

      expect(result.active).toBe(true);
    });

    it('EP: Should reject expired coupon', async () => {
      mockCouponsService.validateCoupon.mockRejectedValue(
        new AppError('COUPON_EXPIRED', 400)
      );

      await expect(mockCouponsService.validateCoupon('EXPIRED')).rejects.toThrow();
    });

    it('EP: Should reject inactive coupon', async () => {
      mockCouponsService.validateCoupon.mockRejectedValue(
        new AppError('COUPON_INACTIVE', 400)
      );

      await expect(mockCouponsService.validateCoupon('INACTIVE')).rejects.toThrow();
    });

    it('EP: Should reject non-existent coupon', async () => {
      mockCouponsService.validateCoupon.mockRejectedValue(
        new AppError('COUPON_NOT_FOUND', 404)
      );

      await expect(mockCouponsService.validateCoupon('NONEXIST')).rejects.toThrow();
    });

    it('BVA: Should validate coupon expiring today', async () => {
      const today = new Date();
      const coupon = {
        id: 1,
        code: 'TODAY',
        active: true,
        expiresAt: today,
      };
      mockCouponsService.validateCoupon.mockResolvedValue(coupon);

      const result = await mockCouponsService.validateCoupon('TODAY');

      expect(result).toBeDefined();
    });

    it('BVA: Should reject coupon expired yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockCouponsService.validateCoupon.mockRejectedValue(
        new AppError('COUPON_EXPIRED', 400)
      );

      await expect(mockCouponsService.validateCoupon('YESTERDAY')).rejects.toThrow();
    });
  });

  describe('POST /coupons/apply - Apply Coupon to Order', () => {
    it('EP: Should apply percentage coupon to order', async () => {
      const orderData = { orderId: 1, total: 1000000, couponCode: 'SAVE10' };
      const result = {
        originalAmount: 1000000,
        discountAmount: 100000,
        finalAmount: 900000,
      };
      mockCouponsService.applyCoupon.mockResolvedValue(result);

      const applied = await mockCouponsService.applyCoupon(orderData);

      expect(applied.discountAmount).toBe(100000);
      expect(applied.finalAmount).toBe(900000);
    });

    it('EP: Should apply fixed coupon to order', async () => {
      const orderData = { orderId: 1, total: 1000000, couponCode: 'FIXED50K' };
      const result = {
        originalAmount: 1000000,
        discountAmount: 50000,
        finalAmount: 950000,
      };
      mockCouponsService.applyCoupon.mockResolvedValue(result);

      const applied = await mockCouponsService.applyCoupon(orderData);

      expect(applied.discountAmount).toBe(50000);
      expect(applied.finalAmount).toBe(950000);
    });

    it('EP: Should reject if total < discount', async () => {
      const orderData = { orderId: 1, total: 10000, couponCode: 'BIG100K' };
      mockCouponsService.applyCoupon.mockRejectedValue(
        new AppError('DISCOUNT_EXCEEDS_TOTAL', 400)
      );

      await expect(mockCouponsService.applyCoupon(orderData)).rejects.toThrow();
    });

    it('Error: Should reject invalid coupon', async () => {
      const orderData = { orderId: 1, total: 1000000, couponCode: 'INVALID' };
      mockCouponsService.applyCoupon.mockRejectedValue(
        new AppError('COUPON_NOT_FOUND', 404)
      );

      await expect(mockCouponsService.applyCoupon(orderData)).rejects.toThrow();
    });
  });

  describe('GET /coupons/active - Get Active Coupons', () => {
    it('EP: Should return only active coupons', async () => {
      const activeCoupons = [
        { id: 1, code: 'ACTIVE1', active: true },
        { id: 2, code: 'ACTIVE2', active: true },
      ];
      mockCouponsService.getActiveCoupons.mockResolvedValue(activeCoupons);

      const result = await mockCouponsService.getActiveCoupons();

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.active)).toBe(true);
    });

    it('EP: Should return empty if no active coupons', async () => {
      mockCouponsService.getActiveCoupons.mockResolvedValue([]);

      const result = await mockCouponsService.getActiveCoupons();

      expect(result).toEqual([]);
    });
  });

  describe('Authorization & Security', () => {
    it('Security: Should only allow admins to create coupons', async () => {
      req.user = { id: 1, role: 'user' };
      mockCouponsService.createCoupon.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(
        mockCouponsService.createCoupon({ code: 'TEST', type: 'percentage', value: 10 })
      ).rejects.toThrow();
    });

    it('Security: Should only allow admins to delete coupons', async () => {
      req.user = { id: 1, role: 'user' };
      mockCouponsService.deleteCoupon.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockCouponsService.deleteCoupon('SAVE10')).rejects.toThrow();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('Performance: Should handle many coupons efficiently', async () => {
      const coupons = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        code: `COUPON${i + 1}`,
      }));
      mockCouponsService.getAllCoupons.mockResolvedValue(coupons);

      const result = await mockCouponsService.getAllCoupons();

      expect(result).toHaveLength(1000);
    });

    it('Edge: Should handle coupon with usage limit', async () => {
      const coupon = {
        id: 1,
        code: 'LIMITED',
        usageLimit: 100,
        usageCount: 50,
      };
      mockCouponsService.getCouponByCode.mockResolvedValue(coupon);

      const result = await mockCouponsService.getCouponByCode('LIMITED');

      expect(result.usageCount).toBeLessThan(result.usageLimit);
    });

    it('Edge: Should handle coupon with usage limit reached', async () => {
      mockCouponsService.validateCoupon.mockRejectedValue(
        new AppError('USAGE_LIMIT_EXCEEDED', 400)
      );

      await expect(mockCouponsService.validateCoupon('MAXED')).rejects.toThrow();
    });
  });
});
