/**
 * Part 4 remainder — shared infra base behavior.
 * - cache fail-open (dead redis → let through)
 * - paginate limit+1 (BVA: exact-multiple total advertises no next page)
 * - ga-data missing config → null
 * - sku: mirrors the colocated `shared/utils/sku.test.ts` cases (no duplication,
 *   single jest home for sku behavior).
 */
import { CacheService } from "../../../src/shared/cache/cache.service.js";
import { paginate } from "../../../src/shared/utils/paginate.js";
import { getGaTrafficBySource } from "../../../src/shared/ga/ga-data.service.js";
import { makeSku } from "@echotrace/shared/utils/sku";

const fakeRedis = () => ({
	on: jest.fn(),
	ping: jest.fn(),
	get: jest.fn(),
	set: jest.fn(),
	del: jest.fn(),
	incr: jest.fn(),
	expire: jest.fn(),
});

// connects lazily, so constructing it never touches the network.
const svcWith = (client: any) => {
	const s = new CacheService(60);
	(s as any).client = client;
	return s;
};

describe("cache fail-open (dead redis → let through)", () => {
	it("increment rejects → Infinity (request proceeds, no block)", async () => {
		const c = fakeRedis();
		c.incr.mockRejectedValue(new Error("redis down"));
		await expect(svcWith(c).increment("otp:1", 300)).resolves.toBe(Infinity);
	});

	it("increment success → value, TTL set on first write only", async () => {
		const c = fakeRedis();
		c.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
		const s = svcWith(c);
		await expect(s.increment("k", 300)).resolves.toBe(1);
		expect(c.expire).toHaveBeenCalledWith("k", 300);
		await expect(s.increment("k", 300)).resolves.toBe(2);
		expect(c.expire).toHaveBeenCalledTimes(1);
	});

	it("get rejects → undefined (cache miss, caller falls back to DB)", async () => {
		const c = fakeRedis();
		c.get.mockRejectedValue(new Error("redis down"));
		await expect(svcWith(c).get("k")).resolves.toBeUndefined();
	});

	it("get null → undefined; get JSON → parsed", async () => {
		const c = fakeRedis();
		c.get.mockResolvedValueOnce(null).mockResolvedValueOnce('{"a":1}');
		const s = svcWith(c);
		await expect(s.get("k")).resolves.toBeUndefined();
		await expect(s.get<{ a: number }>("k")).resolves.toEqual({ a: 1 });
	});

	it("set/delete reject → swallowed (no throw); ping rejects → false", async () => {
		const c = fakeRedis();
		c.set.mockRejectedValue(new Error("down"));
		c.del.mockRejectedValue(new Error("down"));
		c.ping.mockRejectedValue(new Error("down"));
		const s = svcWith(c);
		await expect(s.set("k", { a: 1 })).resolves.toBeUndefined();
		await expect(s.delete("k")).resolves.toBeUndefined();
		await expect(s.ping()).resolves.toBe(false);
		expect(c.set).toHaveBeenCalledWith("k", '{"a":1}', "EX", 60);
	});
});

describe("paginate limit+1 (BVA)", () => {
	const rows = (ids: number[]) => ids.map((id) => ({ id }));
	const delegate = (result: any[]) => ({ findMany: jest.fn().mockResolvedValue(result) });

	it("limit+1 rows → trims to limit, nextCursor = last kept id", async () => {
		const d = delegate(rows([1, 2, 3]));
		const r = await paginate(d, { order: "asc", limit: 2 });
		expect(d.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
		expect(r.items).toEqual(rows([1, 2]));
		expect(r.nextCursor).toBe(2);
	});

	it("exact-multiple total (== limit) → no next page, nextCursor null", async () => {
		const d = delegate(rows([1, 2]));
		const r = await paginate(d, { order: "asc", limit: 2 });
		expect(r.items).toEqual(rows([1, 2]));
		expect(r.nextCursor).toBeNull();
	});

	it("forces isDelete:false and merges extraWhere", async () => {
		const d = delegate([]);
		await paginate(d, { order: "asc", limit: 10 }, {}, { userId: 7 });
		expect(d.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ isDelete: false, userId: 7 }) }),
		);
	});
});

describe("ga-data missing config → null", () => {
	const OLD_ENV = process.env;
	beforeEach(() => {
		process.env = { ...OLD_ENV };
	});
	afterAll(() => {
		process.env = OLD_ENV;
	});

	it("no GA_PROPERTY_ID → null (UI shows placeholder)", async () => {
		delete process.env.GA_PROPERTY_ID;
		await expect(getGaTrafficBySource(30)).resolves.toBeNull();
	});

	it("property set but key file missing and no JSON creds → null", async () => {
		process.env.GA_PROPERTY_ID = "123";
		process.env.GA_CREDENTIALS_PATH = "./no-such-key.json";
		delete process.env.GA_CREDENTIALS_JSON;
		await expect(getGaTrafficBySource(30)).resolves.toBeNull();
	});
});

describe("makeSku (mirrors shared/utils/sku.test.ts)", () => {
	it("real DB option codes → abbreviated SKU", () => {
		expect(makeSku("softcover", "couche200", "A5")).toBe("SOFT_COU200_A5");
		expect(makeSku("hardcover", "offset100", "20x20")).toBe("HARD_OFF100_20X20");
		expect(makeSku("leather", "cotton300", "A4")).toBe("LEATHER_COT300_A4");
		expect(makeSku("saddleStitch", "lustre250", "15x15")).toBe("SADST_LUS250_15X15");
		expect(makeSku("softcover", "matte230", "30x30")).toBe("SOFT_MAT230_30X30");
	});

	it("EN names win over codes; sizes with units/parens/unicode × normalized", () => {
		expect(makeSku("hardcover", "couche200", "A5", { cover: "Hardcover" })).toBe("HARD_COU200_A5");
		expect(makeSku("saddleStitch", "couche200", "A4", { cover: "Saddle stitch" })).toBe("SADST_COU200_A4");
		expect(makeSku("softcover", "couche200", "A5", { paperSize: "A5 (14.8×21 cm)" })).toBe("SOFT_COU200_A5");
		expect(makeSku("softcover", "couche200", "30x30", { paperSize: "30×30 cm" })).toBe("SOFT_COU200_30X30");
	});

	it("garbage in → sanitized, never throws; empty → empty", () => {
		expect(makeSku("", "", "", { cover: undefined, paper: undefined, paperSize: undefined })).toBe("");
		expect(makeSku("bìa mềm", "giấy", "kích thước!", { cover: "bìa mềm", paper: "giấy", paperSize: "kích thước!" })).toBe(
			"BIAMEM_GIAY_KICHTHUOC",
		);
	});

	it("deterministic per cover/paper/size", () => {
		expect(makeSku("hardcover", "couche200", "A5 (14.8-21 cm)")).toBe(makeSku("hardcover", "couche200", "A5 (14.8-21 cm)"));
		expect(makeSku("softcover", "offset100", "20x20")).toBe("SOFT_OFF100_20X20");
	});
});
