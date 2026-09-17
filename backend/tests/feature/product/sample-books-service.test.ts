/**
 * Part 2 — SampleBookService + StockService (B-10..B-12).
 * Base = current code behavior; repos/cache mocked, real `shared` mappers.
 *
 * NOTE (plan-vs-code): the plan's "deduct when sufficient, error when short"
 * lives in order-cart checkout (OrderRepository.updateSampleBookQuantity count
 * check + `quantity == null → skip`), not in this module. This file tests the
 * product-module side: getByIdForStock passthrough (row = ok incl. null
 * quantity, null = short) + StockService aggregation/restock guards.
 */
import { mock } from "jest-mock-extended";
import { SampleBookService } from "../../../src/modules/product/sample-books/sample-books.service.js";
import { SampleBookRepository } from "../../../src/modules/product/sample-books/sample-books.repository.js";
import { SampleBookCacheService } from "../../../src/modules/product/catalog/sample-book.cache.service.js";
import { StockService } from "../../../src/modules/product/sample-books/stock.service.js";

const bookRow = (over: any = {}) => ({
  id: 1,
  name: "S",
  description: null,
  type: "TEMPLATE",
  category: null,
  quantity: null,
  style: "PHOTOBOOK",
  font: "Inter",
  cover: "softcover",
  coverUrl: null,
  paperHeight: null,
  paperWidth: null,
  isActive: true,
  status: "draft",
  content: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-02",
  ...over,
});

const build = () => {
  const cache = mock<SampleBookCacheService>();
  const repo = mock<SampleBookRepository>();
  return { svc: new SampleBookService(cache, repo), cache, repo };
};

describe("SampleBookService.updateStatus (B-10)", () => {
  it.each([
    ["published", true],
    ["draft", true],
    ["archive", false],
  ])("B-10: status %s -> isActive %s", async (status, isActive) => {
    const { svc, repo } = build();
    (repo.update as jest.Mock).mockResolvedValue(bookRow({ status, isActive }));
    const dto = await svc.updateStatus(1, status);
    expect(repo.update).toHaveBeenCalledWith(1, { status, isActive });
    expect(dto.status).toBe(status);
    expect(dto.isActive).toBe(isActive);
  });

  it("B-10b: update with status and no explicit isActive derives it (archive -> false)", async () => {
    const { svc, repo } = build();
    (repo.update as jest.Mock).mockResolvedValue(bookRow({ status: "archive", isActive: false }));
    await svc.update(1, { status: "archive" } as any);
    expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: "archive", isActive: false }));
  });

  it("B-10c: update keeps explicit isActive even when status says otherwise", async () => {
    const { svc, repo } = build();
    (repo.update as jest.Mock).mockResolvedValue(bookRow({ status: "published", isActive: false }));
    await svc.update(1, { status: "published", isActive: false } as any);
    expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ isActive: false }));
  });
});

describe("stock: getByIdForStock + StockService (B-11)", () => {
  it("B-11: row returned when sufficient (incl. null quantity = infinite)", async () => {
    const { svc, repo } = build();
    const unlimited = bookRow({ quantity: null });
    (repo.findForStock as jest.Mock).mockResolvedValue(unlimited);
    await expect(svc.getByIdForStock(1, 5)).resolves.toBe(unlimited);
    expect(repo.findForStock).toHaveBeenCalledWith(1, 5, undefined);

    const exact = bookRow({ quantity: 3 });
    (repo.findForStock as jest.Mock).mockResolvedValue(exact);
    await expect(svc.getByIdForStock(1, 3)).resolves.toBe(exact);
  });

  it("B-11b: null when short (repo finds no row satisfying gte/null)", async () => {
    const { svc, repo } = build();
    (repo.findForStock as jest.Mock).mockResolvedValue(null);
    await expect(svc.getByIdForStock(1, 10)).resolves.toBeNull();
  });

  it("B-11c: sumNeedBySampleBook groups qty per sample, skips books w/o sample, defaults qty 1", async () => {
    const svc = new StockService();
    const db = { book: { findMany: jest.fn().mockResolvedValue([
      { id: 11, sampleBookId: 1 },
      { id: 12, sampleBookId: 1 },
      { id: 13, sampleBookId: null },
    ]) } } as any;
    const need = await svc.sumNeedBySampleBook([11, 12, 13], [{ bookId: 11, quantity: 2 }, { bookId: 12 }], db);
    expect(need.get(1)).toBe(3);
    expect(need.has(null as any)).toBe(false);
    expect(need.size).toBe(1);
  });

  it("B-11d: restock skips empty/non-number items; guards unlimited (quantity not null)", async () => {
    const svc = new StockService();
    await expect(svc.restockOrderAlbums([], {} as any)).resolves.toBeUndefined();
    await expect(svc.restockOrderAlbums([{ noBook: 1 }], {} as any)).resolves.toBeUndefined();

    const db = {
      book: { findMany: jest.fn().mockResolvedValue([{ id: 11, sampleBookId: 7 }]) },
      sampleBook: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    } as any;
    await svc.restockOrderAlbums([{ bookId: 11, quantity: 2 }], db);
    expect(db.sampleBook.updateMany).toHaveBeenCalledWith({
      where: { id: 7, quantity: { not: null } },
      data: { quantity: { increment: 2 } },
    });
  });
});

describe("SampleBookService.update content merge (B-12)", () => {
  it("B-12: changedPages content delta-merges against current row", async () => {
    const { svc, repo } = build();
    (repo.findById as jest.Mock).mockResolvedValue(
      bookRow({ content: { pages: [{ index: 0, canvasJson: "a" }, { index: 1, canvasJson: "b" }] } }),
    );
    (repo.update as jest.Mock).mockResolvedValue(bookRow({}));
    await svc.update(1, { content: { changedPages: [{ index: 1, canvasJson: "B!" }] } } as any);
    expect(repo.findById).toHaveBeenCalledWith(1);
    const update = (repo.update as jest.Mock).mock.calls[0][1];
    expect(update.content.pages[1].canvasJson).toBe("B!");
    expect(update.content.pages[0].canvasJson).toBe("a");
    expect(update.content).not.toHaveProperty("changedPages");
  });

  it("B-12b: plain content passes through without read; returned DTO hides content", async () => {
    const { svc, repo } = build();
    (repo.update as jest.Mock).mockResolvedValue(bookRow({ content: { pages: [] } }));
    const dto = await svc.update(1, { content: { pages: [] }, name: "N" } as any);
    expect(repo.findById).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ content: { pages: [] }, name: "N" }));
    expect(dto.content).toBeNull();
  });
});
