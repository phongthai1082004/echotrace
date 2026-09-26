/**
 * Broadcast + presence + observers + notification controller (N-10..N-14,
 * extras N-15+). DB access is faked behind container.resolve.
 */
import { EventEmitter } from "events";
import { mock } from "jest-mock-extended";
import { container } from "../../../src/di/container.js";
import { NotificationChannel, NotificationType } from "@echotrace/shared";
import { broadcastNotification } from "../../../src/modules/notification/notify/broadcast.js";
import { getMaintenanceStatus, clearMaintenanceStatusCache } from "../../../src/shared/maintenance/maintenance.service.js";
import { PresenceService } from "../../../src/modules/notification/channels/presence.service.js";
import { NotificationRepository } from "../../../src/modules/notification/channels/notification.repository.js";
import { NotificationController } from "../../../src/modules/notification/notification.controller.js";
import { DatabaseObserver } from "../../../src/modules/notification/observers/database.observer.js";
import { EmailObserver } from "../../../src/modules/notification/observers/email.observer.js";
import { SseObserver } from "../../../src/modules/notification/observers/sse.observer.js";

const fakeDb = () => ({
	user: { findMany: jest.fn() },
	notification: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
	maintenanceWindow: { findMany: jest.fn(), updateMany: jest.fn() },
});

const presenceFake = () => ({ sendTo: jest.fn(() => true), online: jest.fn(() => false) });

let db: ReturnType<typeof fakeDb>;
let presence: ReturnType<typeof presenceFake>;
let resolveSpy: jest.SpyInstance;

beforeEach(() => {
	db = fakeDb();
	presence = presenceFake();
	clearMaintenanceStatusCache();
	resolveSpy = jest.spyOn(container, "resolve").mockImplementation(((token: any) =>
		typeof token === "string" ? (presence as any) : { db }) as any);
});

afterEach(() => resolveSpy.mockRestore());

const resFake = (over: any = {}) =>
	({ writableEnded: false, write: jest.fn(() => true), ...over }) as any;

describe("broadcastNotification (N-10)", () => {
	const opts = { type: NotificationType.SYSTEM, title: "T", message: "M" } as any;

	it("N-10 BVA 0 users -> {users:0}, no rows written", async () => {
		db.user.findMany.mockResolvedValue([]);
		await expect(broadcastNotification(opts)).resolves.toEqual({ users: 0 });
		expect(db.notification.createMany).not.toHaveBeenCalled();
	});

	it("N-10 BVA 1 user -> 1 row, broadcast scope", async () => {
		db.user.findMany.mockResolvedValue([{ id: 1 }]);
		await expect(broadcastNotification(opts)).resolves.toEqual({ users: 1 });
		const data = db.notification.createMany.mock.calls[0][0].data;
		expect(data).toHaveLength(1);
		expect(data[0]).toMatchObject({ userId: 1, scope: "broadcast", title: "T" });
		expect(data[0].channels).toEqual(expect.arrayContaining([NotificationChannel.DB, NotificationChannel.PUSH]));
	});

	it("N-10 BVA n users -> N rows; offline push skipped but DB kept (fail-open)", async () => {
		db.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
		presence.sendTo.mockReturnValue(false); // all offline
		await expect(broadcastNotification(opts)).resolves.toEqual({ users: 3 });
		expect(db.notification.createMany.mock.calls[0][0].data).toHaveLength(3);
		expect(presence.sendTo).toHaveBeenCalledTimes(3);
	});

	it("N-10b: DB throws -> {users:0}, no throw", async () => {
		db.user.findMany.mockRejectedValue(new Error("down"));
		await expect(broadcastNotification(opts)).resolves.toEqual({ users: 0 });
	});
});

describe("maintenance flip race (N-11)", () => {
	const live = {
		id: 9,
		startAt: new Date(Date.now() - 60e3),
		endAt: new Date(Date.now() + 60e3),
		reason: "x",
		status: "scheduled",
		createdAt: new Date(),
		endedAt: null,
	};

	it("N-11: lost race (count 0) -> no broadcast; won race (count 1) -> single broadcast", async () => {
		db.maintenanceWindow.findMany.mockResolvedValue([live]);
		db.maintenanceWindow.updateMany.mockResolvedValue({ count: 0 });
		db.user.findMany.mockResolvedValue([]);
		await getMaintenanceStatus();
		expect(db.notification.createMany).not.toHaveBeenCalled();

		db.maintenanceWindow.updateMany.mockResolvedValue({ count: 1 });
		db.user.findMany.mockResolvedValue([{ id: 1 }]);
		clearMaintenanceStatusCache(); // lần 1 đã cache active — xả để lần 2 chạy thật
		await getMaintenanceStatus();
		expect(db.notification.createMany).toHaveBeenCalledTimes(1);
		expect(db.maintenanceWindow.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ id: 9, notifiedAt: null }) }),
		);
	});
});

describe("PresenceService (N-12, N-15)", () => {
	it("N-12: close removes conn — no ghost connections", async () => {
		const svc = new PresenceService();
		const ctl = new NotificationController(mock<NotificationRepository>(), svc as any);
		const req: any = new EventEmitter();
		req.userId = "5";
		const res = { writeHead: jest.fn(), write: jest.fn(), writableEnded: false };
		await ctl.stream(req, res as any);
		expect(svc.online(5)).toBe(true);
		req.emit("close");
		expect(svc.online(5)).toBe(false);
		expect(svc.sendTo(5, "x")).toBe(false);
	});

	it("N-15: sendTo skips ended conns; multi-conn fan-out", () => {
		const svc = new PresenceService();
		const dead = resFake({ writableEnded: true });
		const live = resFake();
		svc.add(1, dead);
		expect(svc.sendTo(1, "x")).toBe(false);
		svc.add(1, live);
		expect(svc.sendTo(1, "x")).toBe(true);
		expect(live.write).toHaveBeenCalledWith("data: x\n\n");
		svc.remove(1, live);
		svc.remove(1, dead);
		expect(svc.online(1)).toBe(false);
	});
});

describe("observers routing (N-16)", () => {
	it("N-16: DatabaseObserver writes on DB/no-channels, skips PUSH-only", async () => {
		const repo = mock<NotificationRepository>();
		const create = jest.fn().mockResolvedValue({});
		Object.defineProperty(repo, "client", { value: { notification: { create } }, configurable: true });
		const obs = new DatabaseObserver(repo);
		const base = { userId: "5", type: NotificationType.SYSTEM, title: "T", message: "M" } as any;
		await obs.update({ ...base, channels: [NotificationChannel.PUSH] });
		expect(create).not.toHaveBeenCalled();
		await obs.update({ ...base, channels: [NotificationChannel.DB] });
		expect(create).toHaveBeenCalledTimes(1);
		await obs.update({ ...base }); // legacy: no channels = write
		expect(create).toHaveBeenCalledTimes(2);
	});

	it("N-16b: EmailObserver sends only on email channel + address", async () => {
		const mail = { send: jest.fn().mockResolvedValue({}) };
		const obs = new EmailObserver(mail as any);
		const base = { userId: "5", type: NotificationType.SYSTEM, title: "T", message: "M" } as any;
		await obs.update({ ...base, channels: [NotificationChannel.DB], email: "a@b.c" });
		await obs.update({ ...base, channels: [NotificationChannel.EMAIL] });
		expect(mail.send).not.toHaveBeenCalled();
		await obs.update({ ...base, channels: [NotificationChannel.EMAIL], email: "a@b.c" });
		expect(mail.send).toHaveBeenCalledWith({ to: "a@b.c", subject: "T", html: "M" });
	});

	it("N-16c: SseObserver pushes only on PUSH channel, fail-open offline", async () => {
		const p = mock<PresenceService>();
		const obs = new SseObserver(p);
		const base = { userId: "5", type: NotificationType.SYSTEM, title: "T", message: "M" } as any;
		await obs.update({ ...base, channels: [NotificationChannel.DB] });
		expect(p.sendTo).not.toHaveBeenCalled();
		p.sendTo.mockReturnValue(false); // offline
		await expect(obs.update({ ...base, channels: [NotificationChannel.PUSH] })).resolves.toBeUndefined();
		expect(p.sendTo).toHaveBeenCalledWith(5, expect.stringContaining('"title":"T"'));
	});
});

describe("NotificationController (N-13/N-14)", () => {
	const build = () => {
		const repo = mock<NotificationRepository>();
		const presenceSvc = mock<PresenceService>();
		return { ctl: new NotificationController(repo, presenceSvc), repo };
	};
	const resHolder = () => {
		let body: any;
		const res: any = { json: jest.fn((b) => (body = b)) };
		return { res, body: () => body };
	};

	it("N-13 BVA: limit 51 -> 50; cursor skips 1 (repo-level)", async () => {
		const { ctl, repo } = build();
		repo.getNotificationList.mockResolvedValue([]);
		const { res } = resHolder();
		await ctl.list({ query: { limit: "51", cursor: "12" }, userId: "5" } as any, res);
		expect(repo.getNotificationList).toHaveBeenCalledWith(5, 50, 12);
	});

	it("N-13b: default limit 20, no cursor", async () => {
		const { ctl, repo } = build();
		repo.getNotificationList.mockResolvedValue([]);
		const { res } = resHolder();
		await ctl.list({ query: {}, userId: "5" } as any, res);
		expect(repo.getNotificationList).toHaveBeenCalledWith(5, 20, undefined);
	});

	it("N-14 rights EP: another user's markRead -> 0", async () => {
		const { ctl, repo } = build();
		repo.markReadOwned.mockResolvedValue(0);
		const { res, body } = resHolder();
		await ctl.markRead({ params: { id: "99" }, userId: "5" } as any, res);
		expect(repo.markReadOwned).toHaveBeenCalledWith(99, 5);
		expect(body().data).toEqual({ marked: 0 });
	});

	it("N-14b: own markRead -> 1", async () => {
		const { ctl, repo } = build();
		repo.markReadOwned.mockResolvedValue(1);
		const { res, body } = resHolder();
		await ctl.markRead({ params: { id: "7" }, userId: "5" } as any, res);
		expect(body().data).toEqual({ marked: 1 });
	});
});
