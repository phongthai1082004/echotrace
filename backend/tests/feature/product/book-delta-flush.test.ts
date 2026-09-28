/**
 * Delta queue + flush: gom INSERT nhỏ, flush gộp 1 lần đọc/ghi, idempotent.
 * Repo mocked; resolveContent thật (shared).
 */
import { mock } from "jest-mock-extended";
import { BookService } from "../../../src/modules/product/books/books.service.js";
import { BookRepository } from "../../../src/modules/product/books/books.repository.js";
import { BookPageDeltaRepository } from "../../../src/modules/product/books/book-delta.repository.js";

jest.mock("../../../src/modules/order-cart/queue/redis-delayed-queue.js", () => ({
  scheduleDelayedJob: jest.fn(),
  FLUSH_IDLE_MS: 600000,
  FLUSH_MAX_PENDING: 50,
}));

const base = (over: any = {}) => ({
  id: 7,
  userId: 1,
  content: { pages: [{ index: 0, canvasJson: "a" }, { index: 1, canvasJson: "b" }] },
  ...over,
});

const build = () => {
  const repo = mock<BookRepository>();
  const deltas = mock<BookPageDeltaRepository>();
  (repo as any).client = {
    $transaction: (fn: any) =>
      fn({
        book: { findUnique: repo.findBookById, update: repo.updateBook },
        bookPageDelta: { deleteMany: (args: any) => (deltas.deleteByIds as jest.Mock)(args.where.id.in) },
      }),
  };
  return { svc: new BookService(repo, deltas), repo, deltas };
};

describe("BookService.flushBook", () => {
  it("no pending -> no read, no write", async () => {
    const { svc, repo, deltas } = build();
    (deltas.listPending as jest.Mock).mockResolvedValue([]);
    await expect(svc.flushBook(7)).resolves.toEqual({ flushed: 0 });
    expect(repo.findBookById).not.toHaveBeenCalled();
    expect(repo.updateBook).not.toHaveBeenCalled();
  });

  it("folds deltas in order, writes once, deletes rows", async () => {
    const { svc, repo, deltas } = build();
    (deltas.listPending as jest.Mock).mockResolvedValue([
      { id: 11, bookId: 7, pageIndex: 1, payload: { index: 1, canvasJson: "B!" } },
      { id: 12, bookId: 7, pageIndex: 0, payload: { index: 0, canvasJson: "A!" } },
    ]);
    (repo.findBookById as jest.Mock).mockResolvedValue(base());
    (repo.updateBook as jest.Mock).mockResolvedValue({});
    (deltas.deleteByIds as jest.Mock).mockResolvedValue({ count: 2 });
    await expect(svc.flushBook(7)).resolves.toEqual({ flushed: 2 });
    const written = (repo.updateBook as jest.Mock).mock.calls[0][0].data;
    expect(written.content.pages[0].canvasJson).toBe("A!");
    expect(written.content.pages[1].canvasJson).toBe("B!");
    expect(written.content).not.toHaveProperty("changedPages");
    expect(deltas.deleteByIds).toHaveBeenCalledWith([11, 12]);
  });

  it("missing book -> drops orphan rows, no write", async () => {
    const { svc, repo, deltas } = build();
    (deltas.listPending as jest.Mock).mockResolvedValue([{ id: 11, bookId: 7, pageIndex: 0, payload: {} }]);
    (repo.findBookById as jest.Mock).mockResolvedValue(null);
    await expect(svc.flushBook(7)).resolves.toEqual({ flushed: 0 });
    expect(repo.updateBook).not.toHaveBeenCalled();
    expect(deltas.deleteByIds).toHaveBeenCalledWith([11]);
  });
});

describe("BookService read-through", () => {
  it("getById merges pending, getMyBooks merges batched", async () => {
    const { svc, repo, deltas } = build();
    (repo.findBookById as jest.Mock).mockResolvedValue(base());
    (deltas.listPending as jest.Mock).mockResolvedValue([{ id: 11, bookId: 7, pageIndex: 1, payload: { index: 1, canvasJson: "B!" } }]);
    const one = await svc.getById(7, 1);
    expect((one.content as any).pages[1].canvasJson).toBe("B!");

    (repo.listBooksByUser as jest.Mock).mockResolvedValue([base(), base({ id: 8 })]);
    (deltas.listPendingForBooks as jest.Mock).mockResolvedValue([
      { id: 12, bookId: 8, pageIndex: 0, payload: { index: 0, thumbnailUrl: "NEW-thumb" } },
    ]);
    const list = await svc.getMyBooks(1);
    expect(list[0].thumbnailUrl).toBeFalsy();
    expect(list[1].thumbnailUrl).toBe("NEW-thumb");
    expect(deltas.listPendingForBooks).toHaveBeenCalledWith([7, 8]);
  });
});

describe("BookService.flushBookIfStale", () => {
  it("fresh pending -> reschedule, no flush", async () => {
    const { svc, deltas } = build();
    (deltas.newestPendingAt as jest.Mock).mockResolvedValue(new Date(Date.now() - 1000));
    const { scheduleDelayedJob } = jest.requireMock("../../../src/modules/order-cart/queue/redis-delayed-queue.js") as any;
    await expect(svc.flushBookIfStale(7)).resolves.toEqual({ flushed: 0 });
    expect(scheduleDelayedJob).toHaveBeenCalled();
  });
});
