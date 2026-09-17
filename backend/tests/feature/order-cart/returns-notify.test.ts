/**
 * Part 1/P1 — ReturnsService notifications (user + admin sides).
 */
import { mock } from "jest-mock-extended";
import { ReturnsService } from "../../../src/modules/order-cart/returns/returns.service.js";
import { OrderRepository } from "../../../src/modules/order-cart/repositories/order.repository.js";
import type { IOrderFinanceService } from "../../../src/modules/financial/settlement/order-finance.bridge.js";
import type { NotificationSubject } from "../../../src/modules/notification/notification.subject.js";

const build = () => {
	const orderRepo = mock<OrderRepository>();
	(orderRepo as any).client = {
		$transaction: jest.fn((fn: any) => fn({})),
		user: {
			findUnique: jest.fn().mockResolvedValue({ email: "u@x.y" }),
			findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
		},
	};
	const finance = mock<IOrderFinanceService>();
	const subject = mock<NotificationSubject>();
	const svc = new ReturnsService(orderRepo, finance, subject);
	return { svc, orderRepo, finance, subject };
};

const userCalls = (subject: any) => subject.notify.mock.calls.filter((c: any[]) => c[0]?.userId === "5");
const adminCalls = (subject: any) => subject.notify.mock.calls.filter((c: any[]) => c[0]?.userId === "1");

describe("requestReturn", () => {
	it("user submits → admin notified (no user self-notify)", async () => {
		const { svc, orderRepo, subject } = build();
		(orderRepo.findOrderForUser as jest.Mock).mockResolvedValue({
			id: 3, userId: 5, status: "delivered", returnState: "none", orderCode: "C3", orderItems: [],
		});
		orderRepo.updateOrder.mockResolvedValue({} as any);
		await svc.requestReturn(3, 5, { reason: "rách bìa" });
		expect(orderRepo.updateOrder).toHaveBeenCalledWith(
			3,
			expect.objectContaining({ returnState: "requested" }),
		);
		expect(userCalls(subject)).toHaveLength(0);
		expect(adminCalls(subject)).toHaveLength(1);
		expect(adminCalls(subject)[0][0].title).toMatch(/đổi trả/);
	});
});

describe("approveReturn / markReshipped", () => {
	it("approve → user notified (mail route)", async () => {
		const { svc, orderRepo, subject } = build();
		(orderRepo.findOrderById as jest.Mock).mockResolvedValue({
			id: 3, userId: 5, status: "delivered", returnState: "requested", orderCode: "C3", orderItems: [],
		});
		orderRepo.updateOrder.mockResolvedValue({} as any);
		await svc.approveReturn(3, { fault: "SELF" } as any);
		expect(userCalls(subject)).toHaveLength(1);
		expect(userCalls(subject)[0][0].channels).toContain("email");
	});

	it("reshipped (self fault, amount>0) → finance outflow + user notified", async () => {
		const { svc, orderRepo, finance, subject } = build();
		(orderRepo.findOrderById as jest.Mock).mockResolvedValue({
			id: 3,
			userId: 5,
			status: "delivered",
			returnState: "reshipping",
			returnFault: "self",
			orderCode: "C3",
			orderItems: [{ defective: true, costPrice: 50, returnQty: 1, quantity: 1 }],
		});
		await svc.markReshipped(3);
		expect(finance.recordOutflow).toHaveBeenCalledWith(expect.anything(), 3, 50, "OTHER", expect.anything());
		expect(userCalls(subject)).toHaveLength(1);
		expect(userCalls(subject)[0][0].title).toMatch(/gửi lại/);
	});
});

describe("reportDefect / markDefective", () => {
	it("user reports → state flips, no notify (admin sees dispatch)", async () => {
		const { svc, orderRepo, subject } = build();
		(orderRepo.findOrderForUser as jest.Mock).mockResolvedValue({
			id: 4, userId: 5, status: "delivered", defectState: "none", orderCode: "C4", orderItems: [],
		});
		orderRepo.updateOrder.mockResolvedValue({} as any);
		await svc.reportDefect(4, 5);
		expect(orderRepo.updateOrder).toHaveBeenCalledWith(4, expect.objectContaining({ defectState: "reported" }));
		expect(subject.notify).not.toHaveBeenCalled();
	});

	it("admin marks defective → user notified", async () => {
		const { svc, orderRepo, subject } = build();
		(orderRepo.findOrderById as jest.Mock).mockResolvedValue({
			id: 4, userId: 5, status: "delivered", defectState: "none", orderCode: "C4", orderItems: [],
		});
		orderRepo.updateOrder.mockResolvedValue({} as any);
		await svc.markDefective(4);
		expect(userCalls(subject)).toHaveLength(1);
		expect(userCalls(subject)[0][0].title).toMatch(/ghi nhận lỗi/);
	});
});
