/**
 * Part 1/P0 — Maintenance windows (function-based service).
 * Fake DB behind container.resolve (kiểu broadcast-presence.test.ts);
 * broadcast chạy thật trên fake (2 users → createMany asserted).
 * ponytail: không jest.mock db.service — factory hoisted chạy trước const (TDZ)
 * và còn chặn luôn dotenv side-effect khiến PayOS thiếu env.
 */
import { container } from "../../../src/di/container.js";
import {
	getMaintenanceStatus,
	startMaintenanceNow,
	stopMaintenanceNow,
	scheduleMaintenance,
	listMaintenanceHistory,
	clearMaintenanceStatusCache,
} from "../../../src/shared/maintenance/maintenance.service.js";

const mockMw = {
	findMany: jest.fn(),
	updateMany: jest.fn(),
	update: jest.fn(),
	create: jest.fn(),
};
const mockUser = { findMany: jest.fn() };
const mockNotification = { createMany: jest.fn() };

let resolveSpy: jest.SpyInstance;

beforeEach(() => {
	jest.clearAllMocks();
	clearMaintenanceStatusCache(); // ponytail: cache 30s trong service — test nào mock DB riêng test đó
	mockMw.findMany.mockResolvedValue([]);
	mockMw.updateMany.mockResolvedValue({ count: 0 });
	mockUser.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
	mockNotification.createMany.mockResolvedValue({ count: 2 });
	// ponytail: class token → fake db; string token (PresenceService) → offline fake
	resolveSpy = jest.spyOn(container, "resolve").mockImplementation(((token: any) =>
		typeof token === "string"
			? ({ sendTo: () => false, online: () => false } as any)
			: ({ db: { maintenanceWindow: mockMw, user: mockUser, notification: mockNotification } }) as any) as any);
});

afterEach(() => resolveSpy.mockRestore());

const row = (over: any = {}) => ({
	id: 7,
	startAt: new Date(Date.now() - 60_000),
	endAt: new Date(Date.now() + 3_600_000),
	reason: null,
	status: "scheduled",
	createdAt: new Date(),
	endedAt: null,
	...over,
});

describe("getStatus", () => {
	it("no rows → inactive, sweeps expired", async () => {
		mockMw.findMany.mockResolvedValue([]);
		const s = await getMaintenanceStatus();
		expect(s).toEqual({ active: false, window: null });
		expect(mockMw.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }),
		);
		expect(mockNotification.createMany).not.toHaveBeenCalled();
	});

	it("future scheduled → inactive, no broadcast", async () => {
		mockMw.findMany.mockResolvedValue([
			row({ startAt: new Date(Date.now() + 3_600_000), endAt: new Date(Date.now() + 7_200_000) }),
		]);
		const s = await getMaintenanceStatus();
		expect(s.active).toBe(false);
		expect(mockNotification.createMany).not.toHaveBeenCalled();
	});

	it("covering scheduled → active + flip once + broadcast once", async () => {
		mockMw.findMany.mockResolvedValue([row()]);
		mockMw.updateMany.mockResolvedValue({ count: 1 });
		const s = await getMaintenanceStatus();
		expect(s.active).toBe(true);
		expect(s.window?.status).toBe("active");
		expect(mockMw.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ id: 7, notifiedAt: null }) }),
		);
		expect(mockNotification.createMany).toHaveBeenCalledTimes(1);
		const arg = mockNotification.createMany.mock.calls[0][0];
		expect(arg.data).toHaveLength(2);
		expect(arg.data[0]).toMatchObject({ scope: "broadcast", title: expect.stringContaining("bảo trì") });
	});

	it("already notified (flip race lost) → active but no second broadcast", async () => {
		mockMw.findMany.mockResolvedValue([row({ status: "active" })]);
		mockMw.updateMany.mockResolvedValue({ count: 0 });
		const s = await getMaintenanceStatus();
		expect(s.active).toBe(true);
		expect(mockNotification.createMany).not.toHaveBeenCalled();
	});

	it("manual open-ended active → active", async () => {
		mockMw.findMany.mockResolvedValue([row({ status: "active", endAt: null })]);
		const s = await getMaintenanceStatus();
		expect(s.active).toBe(true);
		expect(s.window?.endAt).toBeNull();
	});

	it("expired → completed + inactive", async () => {
		mockMw.findMany.mockResolvedValue([
			row({ startAt: new Date(Date.now() - 7_200_000), endAt: new Date(Date.now() - 3_600_000) }),
		]);
		const s = await getMaintenanceStatus();
		expect(s).toEqual({ active: false, window: null });
		expect(mockMw.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }),
		);
	});
});

describe("startNow / stopNow / schedule", () => {
	it("startNow cancels others, creates active, broadcasts", async () => {
		mockMw.create.mockResolvedValue(row({ id: 9, status: "active", endAt: null }));
		const s = await startMaintenanceNow("1", "deploy");
		expect(mockMw.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: { in: ["scheduled", "active"] } }),
				data: expect.objectContaining({ status: "cancelled" }),
			}),
		);
		expect(mockMw.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "active", endAt: null, notifiedAt: expect.any(Date) }),
			}),
		);
		expect(s.active).toBe(true);
		expect(mockNotification.createMany).toHaveBeenCalledTimes(1);
	});

	it("stopNow completes all + broadcasts reopen", async () => {
		const s = await stopMaintenanceNow("1");
		expect(mockMw.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ status: "completed" }) }),
		);
		expect(s).toEqual({ active: false, window: null });
		expect(mockNotification.createMany).toHaveBeenCalledTimes(1);
		const arg = mockNotification.createMany.mock.calls[0][0];
		expect(arg.data[0].title).toMatch(/mở lại/);
	});

	it("schedule rejects end before start", async () => {
		await expect(
			scheduleMaintenance(new Date(Date.now() + 3_600_000), new Date(Date.now() + 1_000)),
		).rejects.toMatchObject({ errorCode: "VALIDATION_FAILED" });
		expect(mockMw.create).not.toHaveBeenCalled();
	});

	it("schedule rejects end in past", async () => {
		await expect(
			scheduleMaintenance(new Date(Date.now() - 7_200_000), new Date(Date.now() - 3_600_000)),
		).rejects.toMatchObject({ errorCode: "VALIDATION_FAILED" });
	});

	it("schedule rejects window over 24h", async () => {
		await expect(
			scheduleMaintenance(new Date(Date.now() + 1_000), new Date(Date.now() + 25 * 3_600_000)),
		).rejects.toMatchObject({ errorCode: "VALIDATION_FAILED" });
	});

	it("schedule rejects invalid dates", async () => {
		await expect(scheduleMaintenance(new Date(NaN), new Date(NaN))).rejects.toMatchObject({
			errorCode: "VALIDATION_FAILED",
		});
	});

	it("schedule valid → creates + broadcasts plan", async () => {
		mockMw.create.mockResolvedValue(row({ id: 10 }));
		const s = await scheduleMaintenance(
			new Date(Date.now() + 3_600_000),
			new Date(Date.now() + 7_200_000),
			"1",
			"db migrate",
		);
		expect(mockMw.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ status: "scheduled", reason: "db migrate" }) }),
		);
		expect(s.active).toBe(false);
		expect(mockNotification.createMany).toHaveBeenCalledTimes(1);
		const arg = mockNotification.createMany.mock.calls[0][0];
		expect(arg.data[0].title).toMatch(/Sắp bảo trì/);
	});
});

describe("history", () => {
	it("passes limit through, clamps", async () => {
		mockMw.findMany.mockResolvedValue([]);
		await listMaintenanceHistory(10);
		expect(mockMw.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { id: "desc" }, take: 10 }),
		);
		await listMaintenanceHistory(500);
		expect(mockMw.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: 50 }),
		);
	});
});
