/**
 * processOrderEvent dispatcher (S-40..S-42) — event string routes to the right
 * handler. Handler logic itself is covered in order-state-machine.test.ts
 * (assign/reconcile_refund already dispatch through here too).
 */
import { mock } from "jest-mock-extended";
import { OrderLifecycleService } from "../../src/modules/order-cart/lifecycle/order-lifecycle.service.js";
import { OrderRepository } from "../../src/modules/order-cart/repositories/order.repository.js";
import { AppError } from "../../src/shared/middleware/app.error.js";
import type { PaymentService } from "../../src/modules/financial/payments/gateways/payment.service.js";
import type { PaymentWebhookService } from "../../src/modules/financial/payments/payment.service.js";
import type { IOrderFinanceService } from "../../src/modules/financial/settlement/order-finance.bridge.js";
import type { IStockService } from "../../src/modules/product/sample-books/stock.service.js";
import type { NotificationSubject } from "../../src/modules/notification/notification.subject.js";

const build = () => {
	const orderRepo = mock<OrderRepository>();
	const finance = mock<IOrderFinanceService>();
	(orderRepo as any).client = {
		$transaction: jest.fn((fn: any) => fn({})),
		createCashflow: jest.fn(),
	};
	const svc = new OrderLifecycleService(
		orderRepo,
		mock<PaymentService>(),
		mock<PaymentWebhookService>(),
		finance,
		mock<IStockService>(),
		mock<NotificationSubject>(),
	);
	return { svc: svc as any, orderRepo, finance };
};

const order = (over = {}) => ({ id: 1, orderCode: "C1", userId: 5, ...over });

describe("processOrderEvent routing", () => {
	it("S-40: missing order → 404 for any event", async () => {
		const { svc, orderRepo } = build();
		(orderRepo.findOrderById as jest.Mock).mockResolvedValue(null);
		await expect(svc.processOrderEvent(9, "ship", {})).rejects.toMatchObject({ statusCode: 404 });
		await expect(svc.processOrderEvent(9, "bogus", {})).rejects.toMatchObject({ statusCode: 404 });
	});

	it("S-41: unknown event → 400", async () => {
		const { svc, orderRepo } = build();
		(orderRepo.findOrderById as jest.Mock).mockResolvedValue(order({ status: "paid" }));
		await expect(svc.processOrderEvent(1, "teleport", {})).rejects.toMatchObject({ statusCode: 400 });
		await expect(svc.processOrderEvent(1, "", {})).rejects.toMatchObject({ statusCode: 400 });
	});

	it("S-42: each event reaches its handler", async () => {
		// ship
		{
			const { svc, orderRepo } = build();
			(orderRepo.findOrderById as jest.Mock).mockResolvedValue(order({ status: "processing" }));
			await svc.processOrderEvent(1, "ship", {});
			expect(orderRepo.updateOrder).toHaveBeenCalledWith(1, expect.objectContaining({ status: "shipping" }));
		}
		// deliver (all items delivered → delivered)
		{
			const { svc, orderRepo } = build();
			(orderRepo.findOrderById as jest.Mock).mockResolvedValue(
				order({ status: "shipping", orderItems: [{}] }),
			);
			await svc.processOrderEvent(1, "deliver", {});
			expect(orderRepo.updateOrder).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ status: "delivered" }),
				expect.anything(),
			);
		}
		// reconcile_supplier → finance outflow per supplier
		{
			const { svc, orderRepo, finance } = build();
			(orderRepo.findOrderById as jest.Mock).mockResolvedValue(
				order({ status: "processing", orderItems: [{ supplierId: 2, costPrice: 30 }] }),
			);
			(orderRepo.findSuppliersByIds as jest.Mock).mockResolvedValue([{ id: 2, name: "NCC" }]);
			await svc.processOrderEvent(1, "reconcile_supplier", {});
			expect(finance.recordOutflow).toHaveBeenCalled();
		}
		// reconcile_cod → Cashflow IN remainder
		{
			const { svc, orderRepo } = build();
			(orderRepo.findOrderById as jest.Mock).mockResolvedValue(
				order({ status: "delivered", paymentType: "half-payment", codReconciledAt: null, totalAmount: 100, paidAmount: 40 }),
			);
			await svc.processOrderEvent(1, "reconcile_cod", {});
			expect(orderRepo.createCashflow).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 60 }),
				expect.anything(),
			);
		}
		// refund → pending_refund only
		{
			const { svc, orderRepo } = build();
			(orderRepo.findOrderById as jest.Mock).mockResolvedValue(order({ status: "paid" }));
			await svc.processOrderEvent(1, "refund", {});
			expect(orderRepo.updateOrder).toHaveBeenCalledWith(1, expect.objectContaining({ status: "pending_refund" }));
		}
		// force_status → status + audit note, short reason → 400
		{
			const { svc, orderRepo } = build();
			(orderRepo.findOrderById as jest.Mock).mockResolvedValue(order({ status: "paid" }));
			await svc.processOrderEvent(1, "force_status", { status: "cancelled", reason: "customer asked" });
			expect(orderRepo.updateOrder).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ status: "cancelled" }),
			);
			await expect(svc.processOrderEvent(1, "force_status", { status: "cancelled", reason: "no" })).rejects.toMatchObject({
				statusCode: 400,
			});
		}
	});
});
