/**
 * Directory listing: role/status filter passthrough, cursor, limit BVA.
 * (Plan names no IDs here; DIR-* minted. Base = real paginate + UserMapper.)
 */
import { mock } from "jest-mock-extended";
import { DirectoryService } from "../../../src/modules/user/directory/directory.service.js";
import { UserRepository } from "../../../src/modules/user/repositories/users.repository.js";

const row = (id: number, over: any = {}) => ({
	id,
	email: `u${id}@x.y`,
	name: `U${id}`,
	role: "user",
	phone: null,
	address: null,
	city: null,
	avatar: null,
	isDelete: false,
	...over,
});

const build = () => {
	const repo = mock<UserRepository>();
	const findMany = jest.fn();
	Object.defineProperty(repo, "client", { value: { user: { findMany } }, configurable: true });
	return { svc: new DirectoryService(repo), repo, findMany };
};

describe("DirectoryService.findAll (DIR-1..DIR-4)", () => {
	it("DIR-1: role filter passes through as extraWhere (+ isDelete:false)", async () => {
		const { svc, findMany } = build();
		findMany.mockResolvedValue([row(1, { role: "admin" })]);
		await svc.findAll({ limit: 10, order: "desc" }, {}, { role: "admin" });
		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ role: "admin", isDelete: false }) }),
		);
	});

	it("DIR-2: limit BVA — take = limit+1 probe; full page advertises nextCursor", async () => {
		const { svc, findMany } = build();
		findMany.mockResolvedValue([row(2), row(1)]);
		const res = await svc.findAll({ limit: 1, order: "desc" }, {}, {});
		expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
		expect(res.items).toHaveLength(1);
		expect(res.nextCursor).toBe(res.items[0].id);
	});

	it("DIR-3: short page -> nextCursor null; cursor -> skip 1", async () => {
		const { svc, findMany } = build();
		findMany.mockResolvedValue([row(1)]);
		const res = await svc.findAll({ limit: 10, order: "desc", cursor: 9 }, {}, {});
		expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: { id: 9 }, skip: 1 }));
		expect(res.nextCursor).toBeNull();
	});

	it("DIR-4: search fans out over name/email/phone", async () => {
		const { svc, findMany } = build();
		findMany.mockResolvedValue([]);
		await svc.findAll(
			{ limit: 10, order: "desc", search: "ann" },
			{ searchFields: ["name", "email", "phone"] },
			{},
		);
		const args = findMany.mock.calls[0][0];
		expect(args.where.OR).toEqual([
			{ name: { contains: "ann", mode: "insensitive" } },
			{ email: { contains: "ann", mode: "insensitive" } },
			{ phone: { contains: "ann", mode: "insensitive" } },
		]);
	});
});
