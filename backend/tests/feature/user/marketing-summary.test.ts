/**
 * Marketing summary: repo groupBy shape (role/status guards), route merge
 * mirror (null -> unknown, GA merge/missing), GA unconfigured -> null.
 * (Plan names no IDs here; MK-* minted.)
 *
 * Route logic lives inline in order.route.ts, so the merge/clamp helpers
 * below mirror it line-for-line (marked MIRROR); the repository where-
 * clauses and the GA guard test real code.
 */
import { OrderRepository } from "../../../src/modules/order-cart/repositories/order.repository.js";
import { getGaTrafficBySource } from "../../../src/shared/ga/ga-data.service.js";

// MIRROR of order.route.ts marketing handler (merge section).
type Row = { source: string; visitors: number; opened: number; preview: number; checkout: number; orders: number; revenue: number; books: number };
const blank = (source: string): Row => ({ source, visitors: 0, opened: 0, preview: 0, checkout: 0, orders: 0, revenue: 0, books: 0 });
function mergeSummary(orderRows: any[], bookRows: any[], gaRows: any[] | null) {
	const bySource: Record<string, Row> = {};
	for (const r of gaRows ?? []) bySource[r.source] = { ...blank(r.source), visitors: r.visitors, opened: r.opened, preview: r.preview, checkout: r.checkout };
	for (const r of orderRows) {
		const key = r.utmSource || "unknown";
		bySource[key] = bySource[key] ?? blank(key);
		bySource[key].orders = r._count._all;
		bySource[key].revenue = Math.round((r._sum.paidAmount ?? 0) * 100) / 100;
	}
	for (const r of bookRows) {
		const key = r.utmSource || "unknown";
		bySource[key] = bySource[key] ?? blank(key);
		bySource[key].books = r._count._all;
	}
	return Object.values(bySource);
}

// MIRROR of the days clamp in the same handler.
const clampDays = (raw: unknown) => Math.min(Math.max(parseInt(String(raw ?? "30")) || 30, 1), 365);

const build = () => {
	const groupBy = jest.fn();
	// real repo, fake db: methods under test must execute, only Prisma is faked
	const repo = new OrderRepository({ db: { order: { groupBy }, book: { groupBy } } } as any);
	return { repo, groupBy };
};

describe("marketing summary repo guards (MK-1/MK-2)", () => {
	it("MK-1: orders grouped by source, admin + pending/cancelled/refund excluded", async () => {
		const { repo, groupBy } = build();
		groupBy.mockResolvedValue([]);
		await repo.summarizeOrdersBySource(new Date("2026-01-01"), new Date("2026-02-01"));
		expect(groupBy).toHaveBeenCalledWith(
			expect.objectContaining({
				by: ["utmSource"],
				where: expect.objectContaining({
					status: { notIn: ["pending_payment", "cancelled", "refunded", "pending_refund"] },
					user: { role: "user", isDelete: false },
				}),
			}),
		);
	});

	it("MK-2: books grouped by source, admin/deleted excluded", async () => {
		const { repo, groupBy } = build();
		groupBy.mockResolvedValue([]);
		await repo.countBooksBySource(new Date("2026-01-01"), new Date("2026-02-01"));
		expect(groupBy).toHaveBeenCalledWith(
			expect.objectContaining({
				by: ["utmSource"],
				where: expect.objectContaining({
					isDelete: false,
					user: { role: "user", isDelete: false },
				}),
			}),
		);
	});
});

describe("marketing summary merge (MK-3..MK-5)", () => {
	it("MK-3: null/empty source -> unknown; GA-only and DB-only keys coexist", () => {
		const rows = mergeSummary(
			[{ utmSource: null, _count: { _all: 2 }, _sum: { paidAmount: 10.555 } }, { utmSource: "fb", _count: { _all: 1 }, _sum: { paidAmount: 5 } }],
			[{ utmSource: "", _count: { _all: 4 } }],
			[{ source: "fb", visitors: 100, opened: 10, preview: 5, checkout: 2 }],
		);
		const byKey = Object.fromEntries(rows.map((r) => [r.source, r]));
		expect(byKey.unknown.orders).toBe(2);
		expect(byKey.unknown.revenue).toBe(10.56); // rounded to 2dp
		expect(byKey.unknown.books).toBe(4);
		expect(byKey.fb).toMatchObject({ visitors: 100, orders: 1, revenue: 5 });
	});

	it("MK-4: GA missing (null) -> DB-only rows, gaConfigured false path", () => {
		const rows = mergeSummary([{ utmSource: "tt", _count: { _all: 3 }, _sum: { paidAmount: null } }], [], null);
		expect(rows).toEqual([expect.objectContaining({ source: "tt", visitors: 0, orders: 3, revenue: 0 })]);
	});

	it("MK-5 BVA: days clamp 0/abc->30, 400->365, -5->1", () => {
		expect(clampDays(undefined)).toBe(30);
		expect(clampDays("abc")).toBe(30);
		expect(clampDays("0")).toBe(30); // falsy -> default, mirrors `|| 30`
		expect(clampDays("400")).toBe(365);
		expect(clampDays("-5")).toBe(1);
		expect(clampDays("30")).toBe(30);
	});
});

describe("GA traffic guard (MK-6)", () => {
	const OLD = process.env.GA_PROPERTY_ID;
	afterEach(() => {
		if (OLD === undefined) delete process.env.GA_PROPERTY_ID;
		else process.env.GA_PROPERTY_ID = OLD;
	});

	it("MK-6: unconfigured GA -> null (UI shows placeholder)", async () => {
		delete process.env.GA_PROPERTY_ID;
		await expect(getGaTrafficBySource(30)).resolves.toBeNull();
	});
});
