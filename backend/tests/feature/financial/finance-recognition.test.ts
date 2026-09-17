/**
 * Plan sections 2.5 + 2.6 — Finance recognition (S-30..S-32) and stock service (S-33..S-34).
 */
import fs from "fs";
import path from "path";
import { OrderFinanceService } from "../../../src/modules/financial/settlement/order-finance.bridge.js";
import { FinanceRepository } from "../../../src/modules/financial/ledger/finance.repository.js";
import { PrismaService } from "../../../lib/db.service.js";
import { StockService } from "../../../src/modules/product/sample-books/stock.service.js";

const buildFinance = () => {
  const tx = {
    expense: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    cashflow: { create: jest.fn().mockResolvedValue({}) },
    income: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
  };
  const db = {
    expense: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    cashflow: { create: jest.fn().mockResolvedValue({}) },
    income: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
  };
  const repo = new FinanceRepository({ db } as unknown as PrismaService);
  return { svc: new OrderFinanceService(repo), tx, db };
};

describe("OrderFinanceService (S-30..S-31)", () => {
  it("S-30: recordOutflow writes Expense + Cashflow OUT on the passed tx", async () => {
    const { svc, tx } = buildFinance();
    await svc.recordOutflow(tx as any, 7, 100, "SUPPLIER", "note", "NCC");
    expect(tx.expense.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 7, amount: 100, category: "SUPPLIER", supplierName: "NCC" }) });
    expect(tx.cashflow.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "OUT", amount: 100, expenseId: 1, orderId: 7 }) });
  });

  it("S-30b: amount <= 0 → no-op", async () => {
    const { svc, tx } = buildFinance();
    await svc.recordOutflow(tx as any, 7, 0, "OTHER", "note");
    await svc.recordOutflow(tx as any, 7, -5, "OTHER", "note");
    expect(tx.expense.create).not.toHaveBeenCalled();
    expect(tx.cashflow.create).not.toHaveBeenCalled();
  });

  it("S-31: recognizeIncome idempotent (no tx → repo client)", async () => {
    const { svc, db } = buildFinance();
    await svc.recognizeIncome(7, 100);
    expect(db.income.create).toHaveBeenCalledTimes(1);
    db.income.findFirst.mockResolvedValue({ id: 1, orderId: 7 });
    await svc.recognizeIncome(7, 100);
    expect(db.income.create).toHaveBeenCalledTimes(1); // still once
  });
});

describe("S-32 refund regression guard (source contract)", () => {
  it("reconcileRefund writes Cashflow OUT directly and never calls recordOutflow", () => {
    const src = fs.readFileSync(path.resolve("src/modules/order-cart/lifecycle/order-lifecycle.service.ts"), "utf8");
    const start = src.indexOf("private async reconcileRefund");
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start, src.indexOf("private async forceStatus", start));
    expect(body).toContain("createCashflow");
    expect(body).toContain("type: 'OUT'");
    expect(body).not.toContain("recordOutflow");
  });
});

describe("StockService (S-33, S-34)", () => {
  const svc = new StockService();

  it("S-33: restockOrderAlbums increments per sample book (quantity not null only)", async () => {
    const db = { book: { findMany: jest.fn() }, sampleBook: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    db.book.findMany.mockResolvedValue([{ id: 10, sampleBookId: 3 }, { id: 11, sampleBookId: 4 }]);
    await svc.restockOrderAlbums(
      [{ bookId: 10, quantity: 2 }, { bookId: 11, quantity: 1 }, { bookId: 12, quantity: 5 }], // 12 unknown → ignored
      db as any,
    );
    expect(db.sampleBook.updateMany).toHaveBeenCalledTimes(2);
    expect(db.sampleBook.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3, quantity: { not: null } }, data: { quantity: { increment: 2 } } }),
    );
    expect(db.sampleBook.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: { increment: 1 } } }),
    );
  });

  it("S-33b: non-array / empty items → no-op", async () => {
    const db = { book: { findMany: jest.fn() }, sampleBook: { updateMany: jest.fn() } };
    await svc.restockOrderAlbums(null as any, db as any);
    await svc.restockOrderAlbums([], db as any);
    expect(db.book.findMany).not.toHaveBeenCalled();
  });

  it("S-34: sumNeedBySampleBook maps bookId → its sampleBook quantity (first match wins)", async () => {
    const db = { book: { findMany: jest.fn().mockResolvedValue([{ id: 1, sampleBookId: 9 }]) } };
    const need = await svc.sumNeedBySampleBook([1], [{ bookId: 1, quantity: 2 }, { bookId: 1, quantity: 3 }], db as any);
    expect(need.get(9)).toBe(2);
  });
});
