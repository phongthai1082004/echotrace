/**
 * Plan section 2.2 -- Payment webhook (S-13..S-20).
 * PaymentWebhookService with a mocked Prisma client; PayOSGateway with a mocked SDK client.
 */
import { mock } from "jest-mock-extended";
import { PaymentWebhookService } from "../../src/modules/financial/payments/payment.service.js";
import { PaymentWebhookRepository } from "../../src/modules/financial/payments/payment.repository.js";
import { PayOSGateway } from "../../src/modules/financial/payments/gateways/payos.service.js";
import { NotificationSubject } from "../../src/modules/notification/notification.subject.js";
import type { IStockService } from "../../src/modules/product/sample-books/stock.service.js";
import type { PayOS } from "@payos/node";
import { TransactionStatus } from "@echotrace/shared";
import { PrismaService } from "../../lib/db.service.js";

const buildWebhook = () => {
  const prisma = mock<PrismaService>();
  const tx = {
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    cashflow: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
  };
  (prisma as any).db = { $transaction: jest.fn((fn: any) => fn(tx)) };
  const repo = new PaymentWebhookRepository(prisma);
  const subject = mock<NotificationSubject>();
  const stock = mock<IStockService>();
  const svc = new PaymentWebhookService(subject, repo, stock);
  return { svc, tx, subject, stock, prisma };
};

const successResult = (over: Partial<Record<string, any>> = {}) => ({
  orderCode: "111",
  gateway: "PAYOS" as const,
  gatewayTransactionCode: "pl-1",
  amount: 200,
  status: TransactionStatus.SUCCESS,
  transactionTime: new Date("2026-01-01T00:00:00Z"),
  rawPayload: {},
  isValidSignature: true,
  ...over,
});

const paidOrder = {
  id: 5,
  status: "pending_payment",
  paidAmount: 0,
  totalAmount: 200,
  orderCode: "111",
  userId: 7,
  user: { email: "a@b.c", name: "Ann" },
};

describe("processWebhook (S-13..S-17)", () => {
  it("S-13: SUCCESS full -> txn SUCCESS + Cashflow IN + order paid + notify", async () => {
    const { svc, tx, subject } = buildWebhook();
    tx.transaction.findUnique.mockResolvedValue({ id: 1, orderId: 5, status: "pending" });
    tx.order.findUnique.mockResolvedValue(paidOrder);

    await svc.processWebhook(successResult());

    expect(tx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ status: "success" }) }),
    );
    expect(tx.cashflow.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "IN", amount: 200, orderId: 5 }) }),
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: expect.objectContaining({ status: "paid", paidAmount: 200 }) }),
    );
    expect(subject.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "7", email: "a@b.c", type: "payment" }),
    );
  });

  it("S-13b: 50% deposit -> partially_paid", async () => {
    const { svc, tx } = buildWebhook();
    tx.transaction.findUnique.mockResolvedValue({ id: 1, orderId: 5, status: "pending" });
    tx.order.findUnique.mockResolvedValue({ ...paidOrder, totalAmount: 400 });
    await svc.processWebhook(successResult({ amount: 200 }));
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "partially_paid", paidAmount: 200 }) }),
    );
  });

  it("S-14: duplicate webhook (txn already SUCCESS) -> early return, no writes", async () => {
    const { svc, tx, subject } = buildWebhook();
    tx.transaction.findUnique.mockResolvedValue({ id: 1, orderId: 5, status: "success" });
    await svc.processWebhook(successResult());
    expect(tx.transaction.update).not.toHaveBeenCalled();
    expect(tx.cashflow.create).not.toHaveBeenCalled();
    expect(subject.notify).not.toHaveBeenCalled();
  });

  it("S-15: dupPaid counts OTHER SUCCESS txns only -- current txn excluded", async () => {
    const { svc, tx } = buildWebhook();
    tx.transaction.findUnique.mockResolvedValue({ id: 1, orderId: 5, status: "pending" });
    tx.order.findUnique.mockResolvedValue(paidOrder);
    tx.transaction.count.mockResolvedValue(1); // another txn already SUCCESS (not this one)
    await svc.processWebhook(successResult());
    expect(tx.transaction.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 1 } }) }),
    );
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("S-16: CANCELLED on pending_payment -> cancelled + restock once", async () => {
    const { svc, tx, stock } = buildWebhook();
    tx.transaction.findUnique.mockResolvedValue({ id: 1, orderId: 5, status: "pending" });
    tx.order.findUnique
      .mockResolvedValueOnce({ ...paidOrder, status: "pending_payment" })
      .mockResolvedValueOnce({ id: 5, orderItems: [{ bookId: 3, quantity: 1 }] });
    await svc.processWebhook(successResult({ status: TransactionStatus.CANCELLED }));
    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "pending_payment" }) }),
    );
    expect(stock.restockOrderAlbums).toHaveBeenCalledWith([{ bookId: 3, quantity: 1 }], expect.anything());
  });

  it("S-17: unknown gatewayTransactionCode -> NOT_FOUND 404", async () => {
    const { svc, tx } = buildWebhook();
    tx.transaction.findUnique.mockResolvedValue(null);
    await expect(svc.processWebhook(successResult())).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("PayOSGateway (S-18..S-20)", () => {
  process.env.PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || "test-checksum-key";
  const makeGateway = () => {
    const payOS = mock<PayOS>();
    (payOS as any).webhooks = { verify: jest.fn(), confirm: jest.fn() };
    (payOS as any).paymentRequests = { create: jest.fn(), get: jest.fn(), cancel: jest.fn() };
    return { gw: new PayOSGateway(payOS), payOS };
  };

  const verifiedData = {
    orderCode: 111,
    amount: 200,
    description: "DH 111",
    accountNumber: "123",
    reference: "r1",
    transactionDateTime: "2026-01-01T00:00:00+07:00",
    paymentLinkId: "pl-1",
  };

  it("S-18: maps code 00 -> SUCCESS", async () => {
    const { gw, payOS } = makeGateway();
    (payOS as any).webhooks.verify.mockResolvedValue(verifiedData);
    const r = await gw.handleWebhook({ code: "00", success: true, data: verifiedData, signature: "x" });
    expect(r.status).toBe("success");
    expect(r.orderCode).toBe("111");
    expect(r.gatewayTransactionCode).toBe("pl-1");
    expect(r.isValidSignature).toBe(true);
  });

  it("S-18b: code 01 -> CANCELLED; other -> FAILED", async () => {
    const { gw, payOS } = makeGateway();
    (payOS as any).webhooks.verify.mockResolvedValue(verifiedData);
    expect((await gw.handleWebhook({ code: "01", success: false, data: verifiedData, signature: "x" })).status).toBe("cancelled");
    expect((await gw.handleWebhook({ code: "99", success: false, data: verifiedData, signature: "x" })).status).toBe("failed");
  });

  it("S-18c: invalid signature -> verify throws (controller answers 400)", async () => {
    const { gw, payOS } = makeGateway();
    (payOS as any).webhooks.verify.mockRejectedValue(new Error("invalid signature"));
    await expect(gw.handleWebhook({ code: "00", data: {}, signature: "bad" })).rejects.toThrow("invalid signature");
  });

  it("S-19: createPaymentLink passes order data + checksum signature", async () => {
    const { gw, payOS } = makeGateway();
    (payOS as any).paymentRequests.create.mockResolvedValue({
      paymentLinkId: "pl-9",
      amount: 100,
      checkoutUrl: "https://pay",
      qrCode: "EMV",
      accountNumber: "911",
      bin: "9704",
      accountName: "SHOP",
      description: "DH 9",
    });
    const r = await gw.createPaymentLink({
      orderCode: 9,
      amount: 100,
      description: "DH 9",
      cancelUrl: "https://x/cancel",
      returnUrl: "https://x/return",
      items: [],
    } as any);
    expect(r.gatewayTransactionCode).toBe("pl-9");
    expect(r.checkoutUrl).toBe("https://pay");
    const arg = ((payOS as any).paymentRequests.create as jest.Mock).mock.calls[0][0];
    expect(arg.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(arg.orderCode).toBe(9);
  });

  it("S-20: refund via cancel -- failure returns false, success true", async () => {
    const { gw, payOS } = makeGateway();
    (payOS as any).paymentRequests.cancel.mockRejectedValue(new Error("HTTP 200, code 221"));
    expect(await gw.refund(9)).toBe(false);
    (payOS as any).paymentRequests.cancel.mockResolvedValue({});
    expect(await gw.refund(9)).toBe(true);
  });
});
