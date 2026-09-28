/**
 * Order history cursor pagination: take+1 probing, id cursor, stable order.
 * Prisma client faked; asserts query shape (not DB behavior).
 */
import { mock } from "jest-mock-extended";
import { OrderRepository } from "../../../src/modules/order-cart/repositories/order.repository.js";

const build = () => {
	const prisma = { order: { findMany: jest.fn() } };
	const repo = new OrderRepository({ db: prisma } as any);
	return { repo, findMany: prisma.order.findMany as jest.Mock };
};

describe("OrderRepository.listMyOrders cursor", () => {
	it("default take 20 -> queries take 21, no cursor/skip", async () => {
		const { repo, findMany } = build();
		findMany.mockResolvedValue([]);
		await expect(repo.listMyOrders(1)).resolves.toEqual({ items: [], nextCursor: null });
		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: 1 }, take: 21 }),
		);
		expect(findMany.mock.calls[0][0]).not.toHaveProperty("cursor");
	});

	it("21 rows -> 20 items + nextCursor = last id", async () => {
		const { repo, findMany } = build();
		const rows = Array.from({ length: 21 }, (_, i) => ({ id: 100 - i }));
		findMany.mockResolvedValue(rows);
		const out = await repo.listMyOrders(1, {});
		expect(out.items).toHaveLength(20);
		expect(out.nextCursor).toBe(80);
	});

	it("cursor -> id cursor + skip 1; short page -> nextCursor null", async () => {
		const { repo, findMany } = build();
		findMany.mockResolvedValue([{ id: 5 }, { id: 3 }]);
		const out = await repo.listMyOrders(1, { cursor: 42, take: 10 });
		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: { id: 42 }, skip: 1, take: 11 }),
		);
		expect(out).toEqual({ items: [{ id: 5 }, { id: 3 }], nextCursor: null });
	});

	it("take clamped 1..50", async () => {
		const { repo, findMany } = build();
		findMany.mockResolvedValue([]);
		await repo.listMyOrders(1, { take: 1000000 });
		expect(findMany.mock.calls[0][0].take).toBe(51);
		await repo.listMyOrders(1, { take: 0 });
		expect(findMany.mock.calls[1][0].take).toBe(2);
	});
});
