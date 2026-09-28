/**
 * Part 1 remainder — CartService pricing + album (C-30..C-32).
 * Collaborators mocked; real `shared` (composeCartItem, computeCouponDiscount).
 * upsertItem passthrough not tested (plan rule); addAlbumToCart asserts branching only.
 */
import { mock } from "jest-mock-extended";
import { CartService, computeItemPrice } from "../../../src/modules/order-cart/cart/cart.service.js";
import { CartRepository } from "../../../src/modules/order-cart/cart/cart.repository.js";
import type { IPrintOptionService } from "../../../src/modules/product/print-options/print-options.service.js";
import type { ICouponService } from "../../../src/modules/order-cart/coupons/coupons.service.js";
import type { ISampleBookService } from "../../../src/modules/product/sample-books/sample-books.service.js";
import type { IBookService } from "../../../src/modules/product/books/books.service.js";
import { ErrorCode, PaymentPlan } from "@echotrace/shared";

const OPTS = [
  { type: "cover", code: "soft", price: 20000, width: null, height: null },
  { type: "paper", code: "matt", price: 5000, width: null, height: null },
  { type: "paperSize", code: "A4", price: 0, width: 210, height: 297 },
];

const book = (over: any = {}) => ({
  id: 1,
  title: "B",
  style: "PHOTOBOOK",
  font: "Inter",
  cover: "soft",
  paperHeight: 297,
  paperWidth: 210,
  content: { pages: new Array(10).fill({}) },
  coverUrl: null,
  type: "TRAVEL",
  ...over,
});

// CartItem row as stored: option codes live on the row, book snapshot on `book`.
const row = (over: any = {}) => ({
  bookId: 1,
  quantity: 1,
  cover: "soft",
  paper: "matt",
  paperSize: "A4",
  book: book(),
  ...over,
});

const build = () => {
  const cartRepo = mock<CartRepository>();
  (cartRepo as any).client = { $transaction: jest.fn((fn: any) => fn({})) };
  const printOptions = mock<IPrintOptionService>();
  const coupons = mock<ICouponService>();
  const samples = mock<ISampleBookService>();
  const books = mock<IBookService>();
  books.withPendingList.mockImplementation(async (b: any) => b);
  books.flushBooks.mockResolvedValue({ flushed: 0 });
  const svc = new CartService(cartRepo, printOptions, coupons, samples, books);
  cartRepo.getCartWithItems.mockResolvedValue({ items: [] } as any);
  cartRepo.createCart.mockResolvedValue({ items: [] } as any);
  printOptions.listRaw.mockResolvedValue(OPTS as any);
  coupons.getByCode.mockResolvedValue(null);
  return { svc, cartRepo, printOptions, coupons, samples };
};

describe("computeItemPrice (C-30 helper)", () => {
  it("C-30a: 10 pages, cover 20000, per-page 5000, A4 factor 1 -> 60000", () => {
    expect(computeItemPrice(10, 20000, 5000, 1)).toBe(60000);
  });

  it("C-30b: rounds up to 1000 + ignores paperSize admin price (factor-driven)", () => {
    // 3 inner pages * 3333 = 9999 + 0 cover -> ceil to 10000
    expect(computeItemPrice(5, 0, 3333, 1)).toBe(10000);
  });
});

describe("CartService.calculateCart (C-30, C-31)", () => {
  it("C-30: price from cover/paper/size options", async () => {
    const { svc } = build();
    (svc as any).cartRepo.getCartWithItems.mockResolvedValue({ items: [row()] } as any);
    const q = await svc.calculateCart(1);
    expect(q.subtotal).toBe(60000);
    expect(q.total).toBe(60000);
    expect(q.discount).toBe(0);
    expect(q.coupon).toBeNull();
    expect(q.items[0].price).toBe(60000);
  });

  it("C-30b: missing option (paper null) -> MISSING_BOOK_OPTIONS 400 with bookId/title", async () => {
    const { svc } = build();
    (svc as any).cartRepo.getCartWithItems.mockResolvedValue({ items: [row({ paper: null })] } as any);
    await expect(svc.calculateCart(1)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining(ErrorCode.MISSING_BOOK_OPTIONS),
    });
  });

	it("C-30c: unknown option code -> same 400", async () => {
		const { svc } = build();
		(svc as any).cartRepo.getCartWithItems.mockResolvedValue({ items: [row({ cover: "nope" })] } as any);
		await expect(svc.calculateCart(1)).rejects.toMatchObject({ statusCode: 400 });
	});

	it("C-30d: album row (paperSize null, book dims 210x297) prices via dims", async () => {
		const { svc } = build();
		(svc as any).cartRepo.getCartWithItems.mockResolvedValue({ items: [row({ paperSize: null })] } as any);
		const q = await svc.calculateCart(1);
		expect(q.items[0].price).toBe(60000);
	});

	it("C-30e: paperSize null + no dims -> still 400", async () => {
		const { svc } = build();
		(svc as any).cartRepo.getCartWithItems.mockResolvedValue({
			items: [row({ paperSize: null, book: book({ paperHeight: null, paperWidth: null }) })],
		} as any);
		await expect(svc.calculateCart(1)).rejects.toMatchObject({ statusCode: 400 });
	});

  it("C-31: oversized FIXED coupon -> total = max(0, sub-discount) = 0", async () => {
    const { svc, coupons } = build();
    (svc as any).cartRepo.getCartWithItems.mockResolvedValue({ items: [row()] } as any);
    coupons.getByCode.mockResolvedValue({
      id: 7,
      code: "BIG",
      discountType: "fixed",
      discountValue: 100000,
      minOrderAmount: 0,
      minOrderType: "value",
      maxDiscountAmount: null,
      maxUsageCount: 0,
      usedCount: 0,
      isActive: true,
      expiresAt: null,
    } as any);
    const q = await svc.calculateCart(1, PaymentPlan.FULL, "BIG");
    expect(q.subtotal).toBe(60000);
    expect(q.discount).toBe(60000);
    expect(q.total).toBe(0);
    expect(q.payNow).toBe(0);
    expect(q.payLater).toBe(0);
    expect(q.coupon).toMatchObject({ id: 7, code: "BIG", amount: 60000 });
  });

  it("C-31b: HALF plan splits payNow/payLater", async () => {
    const { svc } = build();
    (svc as any).cartRepo.getCartWithItems.mockResolvedValue({ items: [row()] } as any);
    const q = await svc.calculateCart(1, PaymentPlan.HALF);
    expect(q.total).toBe(60000);
    expect(q.payNow).toBe(30000);
    expect(q.payLater).toBe(30000);
  });
});

describe("CartService.addAlbumToCart (C-32)", () => {
  const sample = {
    id: 3,
    type: "TRAVEL",
    name: "Album",
    style: "PHOTOBOOK",
    font: "Inter",
    cover: "hard",
    coverUrl: null,
    paperHeight: 300,
    paperWidth: 300,
    content: {},
  };

  it("C-32a: out of stock -> 400, no book touch", async () => {
    const { svc, samples, cartRepo } = build();
    samples.getByIdForStock.mockResolvedValue(null as any);
    await expect(svc.addAlbumToCart(1, { sampleBookId: 3 })).rejects.toMatchObject({ statusCode: 400 });
    expect((cartRepo as any).client.$transaction).not.toHaveBeenCalled();
  });

  it("C-32b: upsert nguyên tử theo unique (userId, sampleBookId), rồi upsert item", async () => {
    const { svc, samples, cartRepo } = build();
    samples.getByIdForStock.mockResolvedValue(sample as any);
    const txBookUpsert = jest.fn().mockResolvedValue({ id: 7 });
    (cartRepo as any).client = { $transaction: (fn: any) => fn({ book: { upsert: txBookUpsert } }) };
      const upsert = jest.spyOn(svc as any, "upsertItemTx").mockResolvedValue({ bookId: 7 } as any);
      await svc.addAlbumToCart(1, { sampleBookId: 3, quantity: 2 });
      expect(txBookUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_sampleBookId: { userId: 1, sampleBookId: 3 } },
          update: {},
        }),
      );
      expect(upsert).toHaveBeenCalledWith(expect.anything(), 1, { bookId: 7, quantity: 2, cover: "hard", paper: null, paperSize: null });
    upsert.mockRestore();
  });

  it("C-32c: create payload mang field sample (title/style/font/cover/dims/content)", async () => {
    const { svc, samples, cartRepo } = build();
    samples.getByIdForStock.mockResolvedValue(sample as any);
    const txBookUpsert = jest.fn().mockResolvedValue({ id: 9 });
    (cartRepo as any).client = { $transaction: (fn: any) => fn({ book: { upsert: txBookUpsert } }) };
      const upsert = jest.spyOn(svc as any, "upsertItemTx").mockResolvedValue({ bookId: 9 } as any);
      await svc.addAlbumToCart(1, { sampleBookId: 3 });
      expect(txBookUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ userId: 1, sampleBookId: 3, title: "Album", style: "PHOTOBOOK" }),
        }),
      );
      expect(upsert).toHaveBeenCalledWith(expect.anything(), 1, { bookId: 9, quantity: 1, cover: "hard", paper: null, paperSize: null });
    upsert.mockRestore();
  });
});
