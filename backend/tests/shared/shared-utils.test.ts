/**
 * Section 1 of docs/tests/automation-test-plan.md -- Shared utils (pure functions).
 * U-1..U-9  computeCouponDiscount
 * U-10..U-15 QueryProcessor.build
 * U-16..U-19 bookPages / composeCartItem / toOrderItem / makeSku
 */
import {
  computeCouponDiscount,
  composeCartItem,
  toOrderItem,
  bookPages,
  type CartCoupon,
} from "@echotrace/shared/dtos/cart/cart.dto";
import { QueryProcessor } from "@echotrace/shared/utils/pagination";
import { makeSku } from "@echotrace/shared/utils/sku";
import { SAMPLE_BOOK_CATEGORIES } from "@echotrace/shared/constants/sample-book-category";

const baseCoupon = (): CartCoupon => ({
  id: 1,
  code: "TEST10",
  discountType: "percentage",
  discountValue: 5,
  minOrderAmount: 0,
  minOrderType: "value",
  maxDiscountAmount: null,
  maxUsageCount: 0,
  usedCount: 0,
  isActive: true,
  expiresAt: null,
});

const items = (qty = 2) => [{ quantity: qty }];

describe("computeCouponDiscount", () => {
  it("U-1: PERCENTAGE rounds to integer money (never a fraction)", () => {
    const d = computeCouponDiscount(baseCoupon(), 123456, items());
    expect(d).toBe(6173); // 123456 * 5% = 6172.8 -> 6173
    expect(Number.isInteger(d)).toBe(true);
  });

  it("U-2: FIXED discount never exceeds subtotal", () => {
    const c = { ...baseCoupon(), discountType: "fixed", discountValue: 500000 };
    expect(computeCouponDiscount(c, 300000, items())).toBe(300000);
  });

  it("U-3: maxDiscountAmount caps a percentage discount", () => {
    const c = { ...baseCoupon(), discountValue: 50, maxDiscountAmount: 10000 };
    expect(computeCouponDiscount(c, 100000, items())).toBe(10000);
  });

  it("U-4: maxDiscountAmount = 0 or null means uncapped", () => {
    const c = { ...baseCoupon(), discountValue: 10 };
    expect(computeCouponDiscount(c, 50000, items())).toBe(5000);
    const zeroCap = { ...c, maxDiscountAmount: 0 };
    expect(computeCouponDiscount(zeroCap, 50000, items())).toBe(5000);
  });

  it("U-5: inactive coupon -> 0", () => {
    expect(computeCouponDiscount({ ...baseCoupon(), isActive: false }, 100000, items())).toBe(0);
  });

  it("U-6: expired coupon -> 0; expiresAt == now is still valid", () => {
    // freeze the clock so the "expiresAt == now is valid" boundary is deterministic
    const T = 1750000000000;
    const spy = jest.spyOn(Date, "now").mockReturnValue(T);
    try {
      const expired = { ...baseCoupon(), expiresAt: new Date(T - 1000) };
      expect(computeCouponDiscount(expired, 100000, items())).toBe(0);
      const boundary = { ...baseCoupon(), expiresAt: new Date(T) }; // not < now -> still valid
      expect(computeCouponDiscount(boundary, 100000, items())).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("U-7: usage limit exhausted -> 0; maxUsageCount = 0 -> unlimited", () => {
    expect(computeCouponDiscount({ ...baseCoupon(), maxUsageCount: 1, usedCount: 1 }, 100000, items())).toBe(0);
    expect(computeCouponDiscount({ ...baseCoupon(), maxUsageCount: 0, usedCount: 99 }, 100000, items())).toBeGreaterThan(0);
  });

  it("U-8: minOrderType VALUE vs QUANTITY thresholds (equal-to passes)", () => {
    const byValue = { ...baseCoupon(), minOrderType: "value", minOrderAmount: 100000 };
    expect(computeCouponDiscount(byValue, 100000, items())).toBe(5000);
    expect(computeCouponDiscount(byValue, 99999, items())).toBe(0);
    const byQty = { ...baseCoupon(), minOrderType: "quantity", minOrderAmount: 3 };
    expect(computeCouponDiscount(byQty, 100000, [{ quantity: 3 }])).toBe(5000);
    expect(computeCouponDiscount(byQty, 100000, [{ quantity: 2 }])).toBe(0);
  });

  it("U-9: missing discountValue -> 0 (never NaN)", () => {
    const c = { ...baseCoupon(), discountValue: undefined as unknown as number };
    expect(computeCouponDiscount(c, 100000, items())).toBe(0);
  });
});

describe("QueryProcessor.build", () => {
  it("U-10: search builds OR only from whitelisted searchFields (insensitive contains)", () => {
    const q = new QueryProcessor({ search: "ann", order: "asc", limit: 10 }, { searchFields: ["name", "email"] }).build();
    expect(q.where.OR).toEqual([
      { name: { contains: "ann", mode: "insensitive" } },
      { email: { contains: "ann", mode: "insensitive" } },
    ]);
  });

  it("U-11: unknown params are dropped (allowedFilterFields whitelist)", () => {
    const q = new QueryProcessor({ search: "", order: "asc", limit: 10, _r: "3", customerId: 7 }, { allowedFilterFields: [] }).build();
    expect(q.where).toEqual({});
  });

  it("U-12: cursor present -> cursor + skip 1; absent -> neither", () => {
    const withCursor = new QueryProcessor({ order: "asc", limit: 10, cursor: 42 }, {}).build();
    expect(withCursor.cursor).toEqual({ id: 42 });
    expect(withCursor.skip).toBe(1);
    const noCursor = new QueryProcessor({ order: "asc", limit: 10 }, {}).build();
    expect(noCursor.cursor).toBeUndefined();
    expect(noCursor.skip).toBeUndefined();
  });

  it("U-13: order desc/asc maps to Prisma orderBy; unknown -> asc", () => {
    expect(new QueryProcessor({ order: "desc", limit: 1 }, {}).build().orderBy[0]).toEqual({ id: "desc" });
    expect(new QueryProcessor({ order: "weird", limit: 1 }, {}).build().orderBy[0]).toEqual({ id: "asc" });
  });

  it("U-14: missing/invalid limit -> 10; string limit parsed", () => {
    expect(new QueryProcessor({ order: "asc" }, {}).build().take).toBe(10);
    expect(new QueryProcessor({ order: "asc", limit: -5 }, {}).build().take).toBe(10);
    expect(new QueryProcessor({ order: "asc", limit: "20" }, {}).build().take).toBe(20);
  });

  it("U-15: sort outside allowedSortFields falls back to defaultSort", () => {
    const q = new QueryProcessor({ order: "asc", limit: 1, sort: "hacked" }, { allowedSortFields: ["name"], defaultSort: "id" }).build();
    expect(q.orderBy[0]).toEqual({ id: "asc" });
  });
});

describe("cart item composition", () => {
  const book = {
    id: 7,
    title: "Travel Journal",
    style: "classic",
    font: "serif",
    cover: "hardcover",
    paper: "couche200",
    paperHeight: 21,
    paperWidth: 14.8,
    content: JSON.stringify({ pages: [{ n: 1, thumbnailUrl: "https://cdn/p1.png" }, { n: 2 }, { n: 3 }] }),
    type: "TEMPLATE",
    coverUrl: "https://cdn/cover.png",
  };

  it("U-16: bookPages parses JSON content; malformed -> 0; non-array -> 0", () => {
    expect(bookPages(book.content)).toBe(3);
    expect(bookPages("{not json")).toBe(0);
    expect(bookPages(JSON.stringify({ pages: "nope" }))).toBe(0);
    expect(bookPages(null)).toBe(0);
  });

  it("U-17: composeCartItem falls back to book cover, but paper/paperSize stay null (priced per print option)", () => {
    const item = composeCartItem({ quantity: 0, cover: null, paper: null, paperSize: null }, book);
    expect(item.cover).toBe("hardcover"); // falls back to book default
    expect(item.paper).toBeNull(); // no fallback — paper is chosen at checkout
    expect(item.paperSize).toBeNull();
    expect(item.quantity).toBe(1); // 0 || 1
    expect(item.pages).toBe(3);
    expect(item.thumbnailUrl).toBe("https://cdn/p1.png"); // taken from content page 1, not book.coverUrl
  });

  it("U-18: toOrderItem snapshot keeps only lifecycle fields (no style/font/coverUrl leak)", () => {
    const snap = toOrderItem({ bookId: 7, title: "T", pages: 3, quantity: 2, cover: "hardcover", paper: "couche200", paperSize: "A5", price: 50000, type: "TEMPLATE" });
    expect(snap).toEqual({
      bookId: 7,
      title: "T",
      thumbnailUrl: null,
      pages: 3,
      quantity: 2,
      cover: "hardcover",
      paper: "couche200",
      paperSize: "A5",
      price: 50000,
      sku: expect.any(String),
      type: "TEMPLATE",
      pdfUrl: null,
    });
    expect("style" in snap).toBe(false);
    expect("coverUrl" in snap).toBe(false);
  });

  it("U-19: makeSku deterministic per cover/paper/size", () => {
    const a = makeSku("hardcover", "couche200", "A5 (14.8-21 cm)");
    const b = makeSku("hardcover", "couche200", "A5 (14.8-21 cm)");
    expect(a).toBe(b);
    expect(a).toMatch(/^HARD_COU200_A5$/);
    expect(makeSku("softcover", "offset100", "20x20")).toBe("SOFT_OFF100_20X20");
  });
});

describe("SAMPLE_BOOK_CATEGORIES constant", () => {
  it("explore categories are the single shared source (7 values, uppercase)", () => {
    expect(SAMPLE_BOOK_CATEGORIES).toEqual(["NATURE", "URBAN", "CLASSIC", "MINIMAL", "ADVENTURE", "CULTURAL", "CUSTOM"]);
  });
});
