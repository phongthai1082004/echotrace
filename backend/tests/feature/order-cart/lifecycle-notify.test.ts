/**
 * Part 1/P1 — cancelOrder notifications (user + admin on all 3 branches).
 */
import { mock } from "jest-mock-extended";
import { OrderLifecycleService } from "../../../src/modules/order-cart/lifecycle/order-lifecycle.service.js";
import { OrderRepository } from "../../../src/modules/order-cart/repositories/order.repository.js";
import type { PaymentService } from "../../../src/modules/financial/payments/gateways/payment.service.js";
import type { PaymentWebhookService } from "../../../src/modules/financial/payments/payment.service.js";
import type { IOrderFinanceService } from "../../../src/modules/financial/settlement/order-finance.bridge.js";
import type { IStockService } from "../../../src/modules/product/sample-books/stock.service.js";
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
	const subject = mock<NotificationSubject>();
	const svc = new OrderLifecycleService(
		orderRepo,
		mock<PaymentService>(),
		mock<PaymentWebhookService>(),
		mock<IOrderFinanceService>(),
		mock<IStockService>(),
		subject,
	);
	return { svc, orderRepo, subject };
};

const userCalls = (subject: any) => subject.notify.mock.calls.filter((c: any[]) => c[0]?.userId === "5");
const adminCalls = (subject: any) => subject.notify.mock.calls.filter((c: any[]) => c[0]?.userId === "1");

describe("cancelOrder notifications", () => {
	it("paid → pending_refund: user + admin (refund amount highlighted)", async () => {
		const { svc, orderRepo, subject } = build();
		(orderRepo.findOrderWithTransactions as jest.Mock).mockResolvedValue({
			id: 2, userId: 5, status: "paid", paidAmount: 80, orderCode: "12", orderItems: [],
		});
		orderRepo.updateOrder.mockResolvedValue({} as any);
		const r = await svc.cancelOrder(2, 5);
		expect(r).toMatchObject({ status: "pending_refund" });
		expect(userCalls(subject)).toHaveLength(1);
		expect(userCalls(subject)[0][0]).toMatchObject({ metadata: expect.objectContaining({ orderId: 2 }) });
		expect(adminCalls(subject)).toHaveLength(1);
		expect(adminCalls(subject)[0][0].title).toMatch(/chờ hoàn tiền/);
		expect(adminCalls(subject)[0][0].metadata).toMatchObject({ actionUrl: "/admin/dispatch" });
	});

	it("pending_payment → cancelled: user (mail route) + admin", async () => {
		const { svc, orderRepo, subject } = build();
		(orderRepo.findOrderWithTransactions as jest.Mock).mockResolvedValue({
			id: 3, userId: 5, status: "pending_payment", paidAmount: 0, orderCode: "13", orderItems: [],
		});
		orderRepo.markCancelled.mockResolvedValue({ count: 1 });
		orderRepo.markCancelled.mockResolvedValue({ count: 1 });
		const r = await svc.cancelOrder(3, 5);
		expect(r).toMatchObject({ status: "cancelled" });
		expect(userCalls(subject)).toHaveLength(1);
		expect(adminCalls(subject)).toHaveLength(1);
		expect(adminCalls(subject)[0][0].title).toMatch(/chưa thanh toán/);
	});

	it("processing → cancelled: user + admin", async () => {
		const { svc, orderRepo, subject } = build();
		(orderRepo.findOrderWithTransactions as jest.Mock).mockResolvedValue({
			id: 4, userId: 5, status: "processing", paidAmount: 0, orderCode: "14", orderItems: [],
		});
		orderRepo.updateOrder.mockResolvedValue({} as any);
		await svc.cancelOrder(4, 5);
		expect(userCalls(subject)).toHaveLength(1);
		expect(adminCalls(subject)).toHaveLength(1);
	});
});

describe("adminUpdateOrder guards", () => {
	it("non-integer supplierId → 400, no write", async () => {
		const { svc, orderRepo } = build();
		await expect(svc.adminUpdateOrder(9, { supplierId: "abc" })).rejects.toMatchObject({ statusCode: 400 });
		expect(orderRepo.updateOrder).not.toHaveBeenCalled();
	});

	it("integer supplierId passes through", async () => {
		const { svc, orderRepo } = build();
		orderRepo.updateOrder.mockResolvedValue({} as any);
		await svc.adminUpdateOrder(9, { supplierId: 3 });
		expect(orderRepo.updateOrder).toHaveBeenCalledWith(9, expect.objectContaining({ supplierId: 3 }));
	});
});
