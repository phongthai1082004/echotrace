/**
 * Notify helpers: order fan-out (auto-PUSH) + admin fan-out (DB+PUSH, no mail).
 */
import { mock } from "jest-mock-extended";
import { notifyOrderUser, notifyAdmins } from "../../../src/modules/notification/notify/order.js";
import { NotificationSubject } from "../../../src/modules/notification/notification.subject.js";
import { NotificationChannel } from "@echotrace/shared";

const clientWith = (user: any, admins: any[] = []) => ({
	user: {
		findUnique: jest.fn().mockResolvedValue(user),
		findMany: jest.fn().mockResolvedValue(admins),
	},
});

describe("notifyOrderUser", () => {
	it("appends PUSH, keeps metadata, no throw without subject", async () => {
		const subject = mock<NotificationSubject>();
		await notifyOrderUser(subject, clientWith({ email: "a@b.c" }), {
			userId: 5,
			type: "order" as any,
			channels: [NotificationChannel.DB],
			title: "T",
			message: "M",
			orderId: 9,
			orderCode: "ABC",
		});
		expect(subject.notify).toHaveBeenCalledTimes(1);
		expect(subject.notify).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "5",
				email: "a@b.c",
				channels: expect.arrayContaining([NotificationChannel.DB, NotificationChannel.PUSH]),
				metadata: expect.objectContaining({ orderId: 9, orderCode: "ABC" }),
			}),
		);
		await expect(notifyOrderUser(null as any, {}, {} as any)).resolves.toBeUndefined();
	});

	it("passes i18n through when given, null when absent", async () => {
		const subject = mock<NotificationSubject>();
		const i18n = { title: { vi: "T", en: "T-en" }, message: { vi: "M", en: "M-en" } };
		await notifyOrderUser(subject, clientWith({ email: "a@b.c" }), {
			userId: 5,
			type: "order" as any,
			channels: [NotificationChannel.DB],
			title: "T",
			message: "M",
			i18n,
			orderId: 9,
		});
		expect(subject.notify).toHaveBeenCalledWith(expect.objectContaining({ i18n }));
		const subject2 = mock<NotificationSubject>();
		await notifyOrderUser(subject2, clientWith({ email: "a@b.c" }), {
			userId: 5,
			type: "order" as any,
			channels: [NotificationChannel.DB],
			title: "T",
			message: "M",
			orderId: 9,
		});
		expect(subject2.notify).toHaveBeenCalledWith(expect.objectContaining({ i18n: null }));
	});
});

describe("notifyAdmins", () => {
	it("fans out to admins only, DB+PUSH, default dispatch url", async () => {
		const subject = mock<NotificationSubject>();
		const client = clientWith(null, [{ id: 1 }, { id: 2 }]);
		await notifyAdmins(subject, client, { type: "order" as any, title: "T", message: "M", orderId: 7 });
		expect(client.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ role: "admin" }) }),
		);
		expect(subject.notify).toHaveBeenCalledTimes(2);
		expect(subject.notify).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "1",
				channels: [NotificationChannel.DB, NotificationChannel.PUSH],
				metadata: expect.objectContaining({ actionUrl: "/admin/dispatch" }),
			}),
		);
	});

	it("no admins → silent, no subject needed", async () => {
		const subject = mock<NotificationSubject>();
		await notifyAdmins(subject, clientWith(null, []), { type: "order" as any, title: "T", message: "M" });
		expect(subject.notify).not.toHaveBeenCalled();
		await expect(notifyAdmins(null as any, {}, {} as any)).resolves.toBeUndefined();
	});
});
