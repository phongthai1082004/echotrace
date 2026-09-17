/**
 * Admin broadcast (DB + SSE, no mail, i18n in metadata).
 * Fake DB behind container.resolve (kiểu broadcast-presence.test.ts).
 */
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { mock } from "jest-mock-extended";
import { container } from "../../../src/di/container.js";
import { NotificationController } from "../../../src/modules/notification/notification.controller.js";
import { BroadcastNotificationDTO } from "../../../../shared/dtos/notification/notification.dto.js";

const mockUser = { findMany: jest.fn() };
const mockNotification = { createMany: jest.fn() };

let resolveSpy: jest.SpyInstance;
let ctrl: NotificationController;
const res = () => ({ json: jest.fn() }) as any;

beforeEach(() => {
	jest.clearAllMocks();
	mockUser.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
	mockNotification.createMany.mockResolvedValue({ count: 2 });
	resolveSpy = jest.spyOn(container, "resolve").mockImplementation(((token: any) =>
		typeof token === "string"
			? ({ sendTo: () => false, online: () => false } as any)
			: ({ db: { user: mockUser, notification: mockNotification } }) as any) as any);
	ctrl = new NotificationController(mock() as any, mock() as any);
});

afterEach(() => resolveSpy.mockRestore());

const body = (over = {}) => ({
	titleVi: "Bảo trì đêm nay",
	titleEn: "Maintenance tonight",
	titleEs: "",
	messageVi: "Shop nghỉ 2 tiếng",
	messageEn: "Down for 2 hours",
	messageEs: "",
	...over,
});

describe("POST /admin/notifications/broadcast", () => {
	it("writes 1 row/user (DB+PUSH, no EMAIL) + SSE to online, returns {users}", async () => {
		const r = res();
		await ctrl.broadcast({ body: body() } as any, r);
		expect(mockNotification.createMany).toHaveBeenCalledTimes(1);
		const data = mockNotification.createMany.mock.calls[0][0].data;
		expect(data).toHaveLength(2);
		expect(data[0]).toMatchObject({
			scope: "broadcast",
			sendBy: "shop",
			title: "Bảo trì đêm nay",
			message: "Shop nghỉ 2 tiếng",
		});
		expect(data[0].channels).toEqual(expect.arrayContaining(["db", "push"]));
		expect(data[0].channels).not.toContain("email");
		expect(data[0].i18n.title).toMatchObject({
			vi: "Bảo trì đêm nay",
			en: "Maintenance tonight",
			es: "Bảo trì đêm nay", // trống → lấy tiếng Việt
		});
		expect(data[0].i18n.message).toMatchObject({
			vi: "Shop nghỉ 2 tiếng",
			en: "Down for 2 hours",
			es: "Shop nghỉ 2 tiếng", // trống → lấy tiếng Việt
		});
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: { users: 2 } }));
	});

	it("0 users → {users:0}, no rows", async () => {
		mockUser.findMany.mockResolvedValue([]);
		const r = res();
		await ctrl.broadcast({ body: body() } as any, r);
		expect(mockNotification.createMany).not.toHaveBeenCalled();
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: { users: 0 } }));
	});
});

describe("PATCH /notifications/:id/read|unread", () => {
	it("forwards to repo with owned guard, returns count", async () => {
		const repo = mock();
		(repo as any).markReadOwned.mockResolvedValue(1);
		(repo as any).markUnreadOwned.mockResolvedValue(0);
		const c = new NotificationController(repo as any, mock() as any);
		const r1 = res();
		await c.markRead({ params: { id: "7" }, userId: "5" } as any, r1);
		expect((repo as any).markReadOwned).toHaveBeenCalledWith(7, 5);
		expect(r1.json).toHaveBeenCalledWith(expect.objectContaining({ data: { marked: 1 } }));
		const r2 = res();
		await c.markUnread({ params: { id: "7" }, userId: "9" } as any, r2);
		expect((repo as any).markUnreadOwned).toHaveBeenCalledWith(7, 9);
		expect(r2.json).toHaveBeenCalledWith(expect.objectContaining({ data: { marked: 0 } }));
	});
});

describe("BroadcastNotificationDTO", () => {
	const check = (b: any) => validate(plainToInstance(BroadcastNotificationDTO, b), { whitelist: true });
	it("valid passes; empty title/vi fails; overlong fails", async () => {
		expect(await check(body())).toHaveLength(0);
		expect((await check(body({ titleVi: "ab" }))).length).toBeGreaterThan(0);
		expect((await check(body({ titleEn: "ab" }))).length).toBeGreaterThan(0);
		expect((await check(body({ messageVi: "" }))).length).toBeGreaterThan(0);
		expect((await check(body({ messageEn: "x".repeat(2001) }))).length).toBeGreaterThan(0);
	});
});
