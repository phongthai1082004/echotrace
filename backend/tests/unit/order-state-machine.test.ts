/**
 * Plan section 2.1 -- Order state machine (S-1..S-12).
 * Repos/services mocked; service logic exercised for real.
 */
import { mock } from "jest-mock-extended";
import { OrderService } from "../../src/features/order/order.service.js";
import { OrderRepository } from "../../src/features/order/order.repository.js";
import { AppError } from "../../src/middleware/app.error.js";
import type { ICartService } from "../../src/features/cart/cart.service.js";
import type { PaymentService } from "../../src/infrastructure/payment/payment.service.js";
import type { PaymentWebhookService } from "../../src/features/payment/payment.service.js";
import type { IOrderFinanceService } from "../../src/features/order/order-finance.service.js";
import type { IPdfQueue } from "../../src/features/pdf/pdf.types.js";
import type { IStockService } from "../../src/features/sample-books/stock.service.js";
import type { ICouponService } from "../../src/features/coupons/coupons.service.js";

const build = () => {
  const orderRepo = mock<OrderRepository>();
  const stock = mock<IStockService>();
  (orderRepo as any).client = { $transaction: jest.fn((fn: any) => fn({})) };
  const svc = new OrderService(
    mock<ICartService>(),
    mock<PaymentService>(),
    mock<PaymentWebhookService>(),
    mock<IOrderFinanceService>(),
    mock<IPdfQueue>(),
    orderRepo,
    stock,
    mock<ICouponService>(),
  );
  return { svc, orderRepo, stock };
};

describe("assertTransition (S-1, S-2)", () => {
  const svc = build().svc as any;

  it("S-1: accepts exactly the ALLOWED map", () => {
    expect(() => svc.assertTransition("processing", "shipping")).not.toThrow();
    expect(() => svc.assertTransition("shipping", "delivered")).not.toThrow();
    expect(() => svc.assertTransition("pending_refund", "refunded")).not.toThrow();
  });

  it("S-2: rejects illegal jumps with 400", () => {
    expect(() => svc.assertTransition("pending_payment", "delivered")).toThrow(AppError);
    expect(() => svc.assertTransition("paid", "cancelled")).toThrow(AppError);
    expect(() => svc.assertTransition("delivered", "shipping")).toThrow(AppError);
  });
});

describe("assignOrder (S-3)", () => {
  it("assigns from paid once, patches items, flips to processing", async () => {
    const { svc, orderRepo } = build();
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({
      id: 1,
      supplierId: null,
      status: "paid",
      orderItems: [{ title: "A" }, { title: "B" }],
    });
    await (svc as any).processOrderEvent(1, "assign", { items: [{ itemIndex: 0, supplierId: 3, costPrice: 50 }] });
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "processing" }),
    );
    const arg = (orderRepo.updateOrder as jest.Mock).mock.calls[0][1];
    expect(arg.orderItems[0]).toMatchObject({ supplierId: 3, costPrice: 50 });
    expect(arg.orderItems[1]).not.toHaveProperty("supplierId");
  });

  it("rejects a second assign and rejects from pending_payment", async () => {
    const { svc, orderRepo } = build();
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({
      id: 1, supplierId: 3, status: "paid", orderItems: [],
    });
    await expect((svc as any).processOrderEvent(1, "assign", { items: [{ itemIndex: 0, supplierId: 4, costPrice: 1 }] }))
      .rejects.toThrow(AppError);

    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({ id: 2, supplierId: null, status: "pending_payment", orderItems: [] });
    await expect((svc as any).processOrderEvent(2, "assign", { items: [{ itemIndex: 0, supplierId: 4, costPrice: 1 }] }))
      .rejects.toThrow(AppError);
  });
});

describe("deliverOrder (S-4)", () => {
  const shippingOrder = { id: 5, status: "shipping", totalAmount: 200, orderItems: [{ deliveredAt: null }, { deliveredAt: null }] };

  it("all delivered -> status delivered + recognizeIncome once", async () => {
    const { svc, orderRepo } = build();
    const finance = mock<IOrderFinanceService>();
    const svcFull = new OrderService(mock<ICartService>(), mock<PaymentService>(), mock<PaymentWebhookService>(), finance, mock<IPdfQueue>(), orderRepo, mock<IStockService>(), mock<ICouponService>());
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue(shippingOrder);
    await (svcFull as any).processOrderEvent(5, "deliver", {});
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(5, expect.objectContaining({ status: "delivered" }), expect.anything());
    expect(finance.recognizeIncome).toHaveBeenCalledTimes(1);
    expect(finance.recognizeIncome).toHaveBeenCalledWith(5, 200, expect.anything());
  });

  it("partial delivery stays shipping, no income", async () => {
    const { orderRepo } = build();
    const finance = mock<IOrderFinanceService>();
    const svcPartial = new OrderService(mock<ICartService>(), mock<PaymentService>(), mock<PaymentWebhookService>(), finance, mock<IPdfQueue>(), orderRepo, mock<IStockService>(), mock<ICouponService>());
    // fresh order — the "deliver all" test mutates its items array via object identity
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({
      id: 5, status: "shipping", totalAmount: 200, orderItems: [{ deliveredAt: null }, { deliveredAt: null }],
    });
    await (svcPartial as any).processOrderEvent(5, "deliver", { itemIndices: [0] });
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(5, expect.objectContaining({ status: "shipping" }), expect.anything());
    expect(finance.recognizeIncome).not.toHaveBeenCalled();
  });
});

describe("reconcileCod (S-5)", () => {
  it("HALF + delivered + not reconciled -> Cashflow IN remainder + codReconciledAt", async () => {
    const { svc, orderRepo } = build();
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({
      id: 9, status: "delivered", paymentType: "half-payment", codReconciledAt: null, totalAmount: 100, paidAmount: 50,
    });
    await (svc as any).processOrderEvent(9, "reconcile_cod", {});
    expect(orderRepo.createCashflow).toHaveBeenCalledWith(
      expect.objectContaining({ type: "IN", amount: 50, orderId: 9 }),
      expect.anything(),
    );
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(9, expect.objectContaining({ codReconciledAt: expect.any(Date) }), expect.anything());
  });

  it("FULL plan or already-reconciled -> no-op", async () => {
    const { svc, orderRepo } = build();
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({ id: 1, status: "delivered", paymentType: "full", codReconciledAt: null });
    await (svc as any).processOrderEvent(1, "reconcile_cod", {});
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({ id: 2, status: "delivered", paymentType: "half-payment", codReconciledAt: new Date() });
    await (svc as any).processOrderEvent(2, "reconcile_cod", {});
    expect(orderRepo.createCashflow).not.toHaveBeenCalled();
  });
});

describe("reconcileSupplier (S-6)", () => {
  it("writes Expense(SUPPLIER) per supplier, skips supplier-fault items", async () => {
    const { svc, orderRepo } = build();
    const finance = mock<IOrderFinanceService>();
    const svcR = new OrderService(mock<ICartService>(), mock<PaymentService>(), mock<PaymentWebhookService>(), finance, mock<IPdfQueue>(), orderRepo, mock<IStockService>(), mock<ICouponService>());
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({
      id: 3, status: "processing", orderCode: "123",
      orderItems: [
        { supplierId: 3, costPrice: 100 },
        { supplierId: 3, costPrice: 50 },
        { supplierId: 4, costPrice: 20, returnFault: "supplier" },
      ],
    });
    (orderRepo.findSuppliersByIds as jest.Mock).mockResolvedValue([{ id: 3, name: "NCC A" }, { id: 4, name: "NCC B" }]);
    await (svcR as any).processOrderEvent(3, "reconcile_supplier", {});
    // supplier 4's item is skipped -> only one outflow of 150
    expect(finance.recordOutflow).toHaveBeenCalledTimes(1);
    expect(finance.recordOutflow).toHaveBeenCalledWith(expect.anything(), 3, 150, "SUPPLIER", expect.stringContaining("NCC A"), "NCC A");
  });

  it("missing costPrice -> MISSING_SUPPLIER_COST 400", async () => {
    const { svc, orderRepo } = build();
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({
      id: 3, status: "processing", orderCode: "123",
      orderItems: [{ supplierId: 3, costPrice: 0 }],
    });
    await expect((svc as any).processOrderEvent(3, "reconcile_supplier", {})).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("refund flow (S-7, S-8)", () => {
  it("S-7: admin refund -> pending_refund ONLY (no PayOS, no ledger, no txn marking)", async () => {
    const { svc, orderRepo } = build();
    const payment = mock<PaymentService>();
    const finance = mock<IOrderFinanceService>();
    const svcR = new OrderService(mock<ICartService>(), payment, mock<PaymentWebhookService>(), finance, mock<IPdfQueue>(), orderRepo, mock<IStockService>(), mock<ICouponService>());
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({ id: 7, status: "paid", paidAmount: 100, orderCode: "42" });
    await (svcR as any).processOrderEvent(7, "refund", {});
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(7, { status: "pending_refund" });
    expect(payment.refund).not.toHaveBeenCalled();
    expect(finance.recordOutflow).not.toHaveBeenCalled();
    expect(orderRepo.markTransactionsRefunded).not.toHaveBeenCalled();
  });

  it("S-8: reconcile_refund -> PayOS best-effort + Cashflow OUT only + txns marked + refunded", async () => {
    const { svc, orderRepo } = build();
    const payment = mock<PaymentService>();
    const finance = mock<IOrderFinanceService>();
    const svcR = new OrderService(mock<ICartService>(), payment, mock<PaymentWebhookService>(), finance, mock<IPdfQueue>(), orderRepo, mock<IStockService>(), mock<ICouponService>());
    payment.refund.mockRejectedValue(new Error("221 cannot cancel paid")); // PayOS best-effort swallowed
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({ id: 7, status: "pending_refund", paidAmount: 100, orderCode: "42" });
    await (svcR as any).processOrderEvent(7, "reconcile_refund", {});
    expect(payment.refund).toHaveBeenCalled();
    expect(orderRepo.markTransactionsRefunded).toHaveBeenCalledWith(7, expect.anything());
    expect(orderRepo.createCashflow).toHaveBeenCalledWith(
      expect.objectContaining({ type: "OUT", amount: 100, orderId: 7 }),
      expect.anything(),
    );
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(7, { status: "refunded" }, expect.anything());
    expect(finance.recordOutflow).not.toHaveBeenCalled(); // refund â‰  Expense
  });

  it("S-8b: reconcile_refund from wrong status -> 400", async () => {
    const { svc, orderRepo } = build();
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({ id: 7, status: "paid", paidAmount: 1, orderCode: "42" });
    await expect((svc as any).processOrderEvent(7, "reconcile_refund", {})).rejects.toThrow(AppError);
    expect(orderRepo.updateOrder).not.toHaveBeenCalled();
  });
});

describe("cancelOrder (S-9, S-10)", () => {
  it("unpaid pending_payment -> cancelled + restock", async () => {
    const { svc, orderRepo, stock } = build();
    (orderRepo.findOrderWithTransactions as jest.Mock).mockResolvedValue({
      id: 1, userId: 5, status: "pending_payment", paidAmount: 0, orderCode: "11", orderItems: [{ bookId: 1, quantity: 2 }],
    });
    (orderRepo.markCancelled as jest.Mock).mockResolvedValue({ count: 1 });
    const r = await svc.cancelOrder(1, 5);
    expect(r).toMatchObject({ status: "cancelled", refunded: false });
    expect(stock.restockOrderAlbums).toHaveBeenCalledWith([{ bookId: 1, quantity: 2 }], expect.anything());
  });

  it("paid -> pending_refund, no restock, no PayOS", async () => {
    const { svc, orderRepo, stock } = build();
    const payment = mock<PaymentService>();
    const svcP = new OrderService(mock<ICartService>(), payment, mock<PaymentWebhookService>(), mock<IOrderFinanceService>(), mock<IPdfQueue>(), orderRepo, stock, mock<ICouponService>());
    (orderRepo.findOrderWithTransactions as jest.Mock).mockResolvedValue({
      id: 2, userId: 5, status: "paid", paidAmount: 80, orderCode: "12", orderItems: [],
    });
    const r = await svcP.cancelOrder(2, 5);
    expect(r).toMatchObject({ status: "pending_refund", refunded: false, amount: 80 });
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(2, { status: "pending_refund" });
    expect(payment.refund).not.toHaveBeenCalled();
    expect(stock.restockOrderAlbums).not.toHaveBeenCalled();
  });

  it("processing -> cancelled directly (no restock, no refund)", async () => {
    const { svc, orderRepo, stock } = build();
    (orderRepo.findOrderWithTransactions as jest.Mock).mockResolvedValue({
      id: 3, userId: 5, status: "processing", paidAmount: 50, orderCode: "13", orderItems: [],
    });
    const r = await svc.cancelOrder(3, 5);
    expect(r.status).toBe("cancelled");
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(3, { status: "cancelled" });
    expect(stock.restockOrderAlbums).not.toHaveBeenCalled();
  });

  it("S-10: cancel race (markCancelled count=0) -> no restock", async () => {
    const { svc, orderRepo, stock } = build();
    (orderRepo.findOrderWithTransactions as jest.Mock).mockResolvedValue({
      id: 4, userId: 5, status: "pending_payment", paidAmount: 0, orderCode: "14", orderItems: [{ bookId: 9, quantity: 1 }],
    });
    (orderRepo.markCancelled as jest.Mock).mockResolvedValue({ count: 0 });
    await svc.cancelOrder(4, 5);
    expect(stock.restockOrderAlbums).not.toHaveBeenCalled();
  });
});

describe("forceStatus (S-12)", () => {
  it("requires a reason â‰¥ 5 chars; appends audit note", async () => {
    const { svc, orderRepo } = build();
    (orderRepo.findOrderById as jest.Mock).mockResolvedValue({ id: 6, note: null });
    await expect((svc as any).processOrderEvent(6, "force_status", { status: "delivered", reason: "no" })).rejects.toThrow(AppError);
    await (svc as any).processOrderEvent(6, "force_status", { status: "delivered", reason: "gateway inconsistency" });
    expect(orderRepo.updateOrder).toHaveBeenCalledWith(6, expect.objectContaining({
      status: "delivered",
      note: expect.stringContaining("[FORCE"),
    }));
  });
});
