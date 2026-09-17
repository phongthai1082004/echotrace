/**
 * Part 1 remainder — PaymentService dispatcher + PayOS getPaymentStatus (P-1..P-7).
 * Strategies mocked; PayOS SDK surface stubbed (no network).
 */
import { PaymentService } from "../../../src/modules/financial/payments/gateways/payment.service.js";
import { PayOSGateway } from "../../../src/modules/financial/payments/gateways/payos.service.js";
import type { IPaymentStrategy } from "../../../src/modules/financial/payments/gateways/payment.strategy.js";
import { PaymentGateway } from "@echotrace/shared";

const strategy = (over: Partial<IPaymentStrategy> & { providerName: PaymentGateway }): IPaymentStrategy =>
  ({
    createPaymentLink: jest.fn(),
    handleWebhook: jest.fn(),
    refund: jest.fn(),
    getPaymentStatus: jest.fn(),
    ...over,
  }) as IPaymentStrategy;

const link = { gateway: PaymentGateway.PAYOS, checkoutUrl: "url" };

describe("PaymentService.createPaymentLink failover (P-1..P-4)", () => {
  it("P-1: no strategies -> 'No payment gateways configured.'", async () => {
    const svc = new PaymentService([]);
    await expect(svc.createPaymentLink({} as any)).rejects.toThrow("No payment gateways configured.");
  });

  it("P-2: first success -> returns, second untouched", async () => {
    const a = strategy({ providerName: PaymentGateway.PAYOS });
    const b = strategy({ providerName: PaymentGateway.SEPAY });
    (a.createPaymentLink as jest.Mock).mockResolvedValue(link);
    const svc = new PaymentService([a, b]);
    await expect(svc.createPaymentLink({} as any)).resolves.toBe(link);
    expect(b.createPaymentLink).not.toHaveBeenCalled();
  });

  it("P-3: first fails -> falls through to second", async () => {
    const a = strategy({ providerName: PaymentGateway.PAYOS });
    const b = strategy({ providerName: PaymentGateway.SEPAY });
    (a.createPaymentLink as jest.Mock).mockRejectedValue(new Error("down"));
    (b.createPaymentLink as jest.Mock).mockResolvedValue(link);
    const svc = new PaymentService([a, b]);
    await expect(svc.createPaymentLink({} as any)).resolves.toBe(link);
  });

  it("P-4: all fail -> 'All payment gateways failed' with last error", async () => {
    const a = strategy({ providerName: PaymentGateway.PAYOS });
    (a.createPaymentLink as jest.Mock).mockRejectedValue(new Error("boom"));
    const svc = new PaymentService([a]);
    await expect(svc.createPaymentLink({} as any)).rejects.toThrow("All payment gateways failed. Last error: boom");
  });
});

describe("PaymentService gateway routing (P-5, P-6)", () => {
  it("P-5: unknown gateway -> not supported (webhook/refund/status)", async () => {
    const svc = new PaymentService([strategy({ providerName: PaymentGateway.PAYOS })]);
    await expect(svc.handleWebhook(PaymentGateway.SEPAY, {})).rejects.toThrow("not supported");
    await expect(svc.refund(PaymentGateway.SEPAY, 1)).rejects.toThrow("not supported");
    await expect(svc.getPaymentStatus(PaymentGateway.SEPAY, 1)).rejects.toThrow("not supported");
  });

  it("P-6: known gateway -> delegates and returns strategy result", async () => {
    const a = strategy({ providerName: PaymentGateway.PAYOS });
    (a.handleWebhook as jest.Mock).mockResolvedValue({ status: "ok" });
    (a.refund as jest.Mock).mockResolvedValue(true);
    (a.getPaymentStatus as jest.Mock).mockResolvedValue("PAID");
    const svc = new PaymentService([a]);
    await expect(svc.handleWebhook(PaymentGateway.PAYOS, { x: 1 })).resolves.toEqual({ status: "ok" });
    await expect(svc.refund(PaymentGateway.PAYOS, 5)).resolves.toBe(true);
    await expect(svc.getPaymentStatus(PaymentGateway.PAYOS, 5)).resolves.toBe("PAID");
    expect(a.getPaymentStatus).toHaveBeenCalledWith(5);
  });
});

describe("PayOSGateway.getPaymentStatus (P-7)", () => {
  const gw = (get: jest.Mock) =>
    new PayOSGateway({ paymentRequests: { get }, webhooks: {} } as any);

  it("P-7a: SDK status -> returned as-is", async () => {
    const get = jest.fn().mockResolvedValue({ status: "PAID" });
    await expect(gw(get).getPaymentStatus(123)).resolves.toBe("PAID");
    expect(get).toHaveBeenCalledWith(123);
  });

  it("P-7b: SDK throws -> null (verify fallback stays silent)", async () => {
    const get = jest.fn().mockRejectedValue(new Error("not found"));
    await expect(gw(get).getPaymentStatus(123)).resolves.toBeNull();
  });

  it("P-7c: missing status field -> null", async () => {
    const get = jest.fn().mockResolvedValue({});
    await expect(gw(get).getPaymentStatus(123)).resolves.toBeNull();
  });
});
