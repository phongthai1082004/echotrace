/**
 * Part 1 remainder — FinanceService ledger (L-1..L-10).
 * Repo mocked; date math mirrors the service (12-month keys, T23:59:59.999Z day cap).
 */
import { mock } from "jest-mock-extended";
import { FinanceService } from "../../../src/modules/financial/ledger/finance.service.js";
import { FinanceRepository } from "../../../src/modules/financial/ledger/finance.repository.js";

const build = () => {
  const repo = mock<FinanceRepository>();
  return { svc: new FinanceService(repo), repo };
};

const monthKeys = () => {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
};

describe("FinanceService.getSummary (L-1, L-2)", () => {
  it("L-1: null sums -> all 0, 12 zeroed months", async () => {
    const { svc, repo } = build();
    repo.aggregateFinancePeriod.mockResolvedValue({ _sum: {} } as any);
    repo.listFinancePeriods.mockResolvedValue([]);
    const r = await svc.getSummary();
    expect(r.summary).toEqual({
      totalOrders: 0,
      totalRevenue: 0,
      totalExpense: 0,
      totalSupplierExpense: 0,
      cashInflow: 0,
      cashOutflow: 0,
      totalProfit: 0,
      cashOnHand: 0,
      receivables: 0,
      payables: 0,
    });
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly.map((m) => m.period)).toEqual(monthKeys());
    expect(r.monthly.every((m) => m.revenue === 0 && m.orders === 0)).toBe(true);
  });

  it("L-2: values mapped, missing periods zeroed", async () => {
    const { svc, repo } = build();
    repo.aggregateFinancePeriod.mockResolvedValue({
      _sum: { totalOrders: 5, totalRevenue: "100000", totalExpense: 20000, cashOnHand: "30000" },
    } as any);
    const keys = monthKeys();
    repo.listFinancePeriods.mockResolvedValue([{ period: keys[11], totalRevenue: "5000", totalOrders: 2 }] as any);
    const r = await svc.getSummary();
    expect(r.summary.totalOrders).toBe(5);
    expect(r.summary.totalRevenue).toBe(100000);
    expect(r.summary.cashOnHand).toBe(30000);
    expect(r.summary.receivables).toBe(0);
    expect(r.monthly[11]).toEqual({ period: keys[11], revenue: 5000, orders: 2 });
    expect(r.monthly[0]).toEqual({ period: keys[0], revenue: 0, orders: 0 });
  });
});

describe("FinanceService.getSuppliers (L-3)", () => {
  it("L-3: raw rows -> numbers, null debt -> 0", async () => {
    const { svc, repo } = build();
    repo.getSupplierDebtsRaw.mockResolvedValue([
      { id: "1", name: "A", totalDebt: "15000", thisMonth: "5000" },
      { id: 2, name: "B", totalDebt: null, thisMonth: null },
    ]);
    await expect(svc.getSuppliers()).resolves.toEqual([
      { id: 1, name: "A", totalDebt: 15000, thisMonth: 5000 },
      { id: 2, name: "B", totalDebt: 0, thisMonth: 0 },
    ]);
    expect(repo.getSupplierDebtsRaw).toHaveBeenCalledWith(14, expect.any(Date), expect.any(Date));
  });
});

describe("FinanceService.createExpense (L-4..L-6)", () => {
  it("L-4: bad amount (0/-5/NaN/string) -> 400, repo untouched", async () => {
    const { svc, repo } = build();
    for (const amount of [0, -5, NaN, "10", Infinity]) {
      await expect(svc.createExpense({ amount: amount as any, category: "OPERATING" })).rejects.toMatchObject({
        statusCode: 400,
      });
    }
    expect(repo.createExpense).not.toHaveBeenCalled();
  });

  it("L-5: bad category -> 400", async () => {
    const { svc, repo } = build();
    await expect(svc.createExpense({ amount: 1000, category: "NOPE" })).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.createExpense).not.toHaveBeenCalled();
  });

  it("L-6: valid -> mapped fields (date string parsed, defaults now)", async () => {
    const { svc, repo } = build();
    repo.createExpense.mockResolvedValue({ id: 1 } as any);
    await svc.createExpense({ amount: 2500, category: "SUPPLIER", description: "d", date: "2026-01-15", supplierName: "S", note: "n" });
    expect(repo.createExpense).toHaveBeenCalledWith({
      amount: 2500,
      category: "SUPPLIER",
      description: "d",
      date: new Date("2026-01-15"),
      supplierName: "S",
      note: "n",
    });
    await svc.createExpense({ amount: 100, category: "OTHER" });
    const arg = (repo.createExpense as jest.Mock).mock.calls[1][0];
    expect(arg.date).toBeInstanceOf(Date);
    expect(arg.description).toBeUndefined();
  });
});

describe("FinanceService list + paginate (L-7..L-10)", () => {
  it("L-7: listIncome date range -> receivedAt gte/lte (day cap)", async () => {
    const { svc, repo } = build();
    repo.listIncomes.mockResolvedValue([]);
    await svc.listIncome({ from: "2026-01-01", to: "2026-01-31", limit: 10 });
    expect(repo.listIncomes).toHaveBeenCalledWith(
      { receivedAt: { gte: new Date("2026-01-01"), lte: new Date("2026-01-31T23:59:59.999Z") } },
      10,
    );
  });

  it("L-8: listExpense category filter, no range -> no date key", async () => {
    const { svc, repo } = build();
    repo.listExpenses.mockResolvedValue([]);
    await svc.listExpense({ category: "PAYROLL" });
    expect(repo.listExpenses).toHaveBeenCalledWith({ category: "PAYROLL" }, undefined);
  });

  it("L-9: listCashflow type filter passes through", async () => {
    const { svc, repo } = build();
    repo.listCashflows.mockResolvedValue([]);
    await svc.listCashflow({ type: "OUT" });
    expect(repo.listCashflows).toHaveBeenCalledWith({ type: "OUT" }, undefined);
  });

  it("L-10: full page -> nextCursor last id; short page -> null; default taken 20", async () => {
    const { svc, repo } = build();
    const full = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    repo.listIncomes.mockResolvedValue(full);
    await expect(svc.listIncome({ limit: 10 })).resolves.toEqual({ items: full, nextCursor: 10 });
    repo.listIncomes.mockResolvedValue(full.slice(0, 5));
    await expect(svc.listIncome({ limit: 10 })).resolves.toEqual({ items: full.slice(0, 5), nextCursor: null });
    const twenty = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
    repo.listIncomes.mockResolvedValue(twenty);
    await expect(svc.listIncome({})).resolves.toEqual({ items: twenty, nextCursor: 20 });
  });
});
