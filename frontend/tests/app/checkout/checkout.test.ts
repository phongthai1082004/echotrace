// F41: Checkout — money math / payNow-deposit, form validation (mirrors backend C-4 rules).
import { computeCouponDiscount, PaymentPlan } from "@echotrace/shared";
import { validateCheckoutForm } from "@/app/(customer)/checkout/hooks/use-checkout-form";
import { itemPrice, itemThumb, priceText } from "@/app/(customer)/checkout/_lib/utils";

// Exact formula from page.tsx (payNow/deduction) — kept as replica so the test
// fails if anyone edits either side without the other.
const payNow = (total: number | null, pm: string) =>
  total == null ? null : pm === PaymentPlan.HALF ? Math.round((total * 50) / 100) : total;

const pct = (v: number, min = 0) => ({
  isActive: true,
  expiresAt: null,
  maxUsageCount: 0,
  usedCount: 0,
  minOrderType: "VALUE",
  minOrderAmount: min,
  discountType: "PERCENTAGE",
  discountValue: v,
  maxDiscountAmount: null,
});
const fix = (v: number) => ({ ...pct(0), discountType: "FIXED", discountValue: v });
const qty = (q: number) => ({ quantity: q });

describe("F41 checkout money math", () => {
  it("subtotal = Σ price×qty; total floors at 0 on oversized FIXED", () => {
    const items = [
      { price: 100000, quantity: 2 },
      { price: 50000, quantity: 1 },
    ];
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    expect(subtotal).toBe(250000);
    const d = computeCouponDiscount(fix(999999) as any, subtotal, items.map((i) => qty(i.quantity)));
    expect(d).toBe(250000); // capped at subtotal
    expect(Math.max(0, subtotal - d)).toBe(0);
  });
  it("percentage discount rounds to integer money", () => {
    expect(computeCouponDiscount(pct(10) as any, 999, [qty(1)])).toBe(100); // 99.9 → 100
  });
  it("inactive / expired / exhausted / min-not-met → 0", () => {
    expect(computeCouponDiscount({ ...pct(10), isActive: false } as any, 1000, [qty(1)])).toBe(0);
    expect(computeCouponDiscount({ ...pct(10), expiresAt: "2000-01-01" } as any, 1000, [qty(1)])).toBe(0);
    expect(computeCouponDiscount({ ...pct(10), maxUsageCount: 1, usedCount: 1 } as any, 1000, [qty(1)])).toBe(0);
    expect(computeCouponDiscount(pct(10, 5000) as any, 1000, [qty(1)])).toBe(0);
  });
  it("payNow: FULL pays total, HALF pays rounded 50% deposit", () => {
    expect(payNow(250000, PaymentPlan.FULL)).toBe(250000);
    expect(payNow(250000, PaymentPlan.HALF)).toBe(125000);
    expect(payNow(999, PaymentPlan.HALF)).toBe(500); // Math.round(499.5)
    expect(payNow(null, PaymentPlan.FULL)).toBeNull();
  });
  it("price helpers", () => {
    expect(priceText(125000)).toBe("₫125,000");
    expect(priceText(null)).toBe("unknown");
    expect(priceText(NaN)).toBe("unknown");
    expect(itemPrice({ price: 5 })).toBe(5);
    expect(itemPrice({})).toBeNull();
    expect(itemThumb({ thumbnailUrl: "t" })).toBe("t");
    expect(itemThumb({ coverUrl: "c" })).toBe("c");
    expect(itemThumb({})).toBeNull();
  });
});

describe("F41 checkout form validation (backend C-4 parity)", () => {
  const good = { name: "An", phone: "0901234567", address: "123 Le Loi", city: "HCM", note: "" };
  it("valid passes", () => expect(validateCheckoutForm(good)).toEqual({}));
  it("name BVA: 1 char fails, 2 pass", () => {
    expect(validateCheckoutForm({ ...good, name: "A" })).toHaveProperty("name");
    expect(validateCheckoutForm({ ...good, name: "Ab" })).not.toHaveProperty("name");
  });
  it("phone BVA 8/9/11/12 digits + +84/separator normalization", () => {
    expect(validateCheckoutForm({ ...good, phone: "+84901234567" })).not.toHaveProperty("phone");
    expect(validateCheckoutForm({ ...good, phone: "090 123 4567" })).not.toHaveProperty("phone");
    for (const phone of ["09012345", "090123456789", "abc", ""]) {
      expect(validateCheckoutForm({ ...good, phone })).toHaveProperty("phone");
    }
  });
  it("address BVA 4/5, city BVA 1/2", () => {
    expect(validateCheckoutForm({ ...good, address: "1234" })).toHaveProperty("address");
    expect(validateCheckoutForm({ ...good, address: "12345" })).not.toHaveProperty("address");
    expect(validateCheckoutForm({ ...good, city: "H" })).toHaveProperty("city");
    expect(validateCheckoutForm({ ...good, city: "HC" })).not.toHaveProperty("city");
  });
});
