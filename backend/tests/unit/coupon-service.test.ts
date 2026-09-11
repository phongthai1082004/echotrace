/**
 * Plan section 2.3 -- Coupon service (S-21..S-24).
 */
import { mock } from "jest-mock-extended";
import { CouponService } from "../../src/modules/order-cart/coupons/coupons.service.js";
import { CouponRepository } from "../../src/modules/order-cart/coupons/coupons.repository.js";

const build = () => {
  const repo = mock<CouponRepository>();
  return { svc: new CouponService(repo), repo };
};

describe("CouponService.create (S-21, S-22)", () => {
  it("S-21: FIXED + maxDiscountAmount -> VALIDATION_FAILED 400", async () => {
    const { svc, repo } = build();
    await expect(
      svc.create({ code: "X", discountType: "fixed", discountValue: 10, maxDiscountAmount: 5 } as any),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.createCoupon).not.toHaveBeenCalled();
  });

  it("S-21b: uppercases code, appends -<timestamp>, normalizes type", async () => {
    const { svc, repo } = build();
    (repo.createCoupon as jest.Mock).mockResolvedValue({ id: 1 });
    await svc.create({ code: "sale", discountType: "percentage", discountValue: 10 } as any);
    const arg = (repo.createCoupon as jest.Mock).mock.calls[0][0];
    expect(arg.code).toMatch(/^SALE-\d+$/);
    expect(arg.discountType).toBe("PERCENTAGE");
    expect(arg.minOrderAmount).toBe(0);
  });

  it("S-22: P2002 duplicate -> COUPON_CODE_EXISTS 409", async () => {
    const { svc, repo } = build();
    (repo.createCoupon as jest.Mock).mockRejectedValue({ code: "P2002" });
    await expect(svc.create({ code: "dup", discountType: "fixed", discountValue: 1 } as any)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("CouponService usage guards (S-23, S-24)", () => {
  const row = (over: any = {}) => ({ id: 1, isActive: true, expiresAt: null, maxUsageCount: 2, usedCount: 0, ...over });

  it("S-23: valid -> increment once", async () => {
    const { svc, repo } = build();
    (repo.findByIdInTx as jest.Mock).mockResolvedValue(row());
    const tx = {} as any;
    await svc.validateAndIncrementCoupon(1, tx);
    expect(repo.incrementUsedCount).toHaveBeenCalledWith(1, tx);
  });

  it("S-23b: inactive / expired / over-limit -> 400, no increment", async () => {
    const { svc, repo } = build();
    const tx = {} as any;
    (repo.findByIdInTx as jest.Mock).mockResolvedValue(null);
    await expect(svc.validateAndIncrementCoupon(1, tx)).rejects.toMatchObject({ statusCode: 400 });
    (repo.findByIdInTx as jest.Mock).mockResolvedValue(row({ isActive: false }));
    await expect(svc.validateAndIncrementCoupon(1, tx)).rejects.toMatchObject({ statusCode: 400 });
    (repo.findByIdInTx as jest.Mock).mockResolvedValue(row({ expiresAt: "2020-01-01" }));
    await expect(svc.validateAndIncrementCoupon(1, tx)).rejects.toMatchObject({ statusCode: 400 });
    (repo.findByIdInTx as jest.Mock).mockResolvedValue(row({ usedCount: 2 }));
    await expect(svc.validateAndIncrementCoupon(1, tx)).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.incrementUsedCount).not.toHaveBeenCalled();
  });

  it("S-24: maxUsageCount = 0 (unlimited) -> no increment call", async () => {
    const { svc, repo } = build();
    await svc.incrementCouponUsage(1, 0, {} as any);
    expect(repo.incrementUsedCount).not.toHaveBeenCalled();
  });
});
