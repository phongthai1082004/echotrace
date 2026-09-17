/**
 * Part 1/P1 — PaymentController.payosWebhook: signature vs business errors.
 */
import { mock } from "jest-mock-extended";
import { PaymentController } from "../../../src/modules/financial/payments/payment.controller.js";
import type { PaymentService } from "../../../src/modules/financial/payments/gateways/payment.service.js";
import type { PaymentWebhookService } from "../../../src/modules/financial/payments/payment.service.js";

const res = () => {
	const r: any = { statusCode: 200 };
	r.status = jest.fn().mockReturnValue(r);
	r.json = jest.fn().mockReturnValue(r);
	return r;
};

describe("payosWebhook", () => {
	it("invalid signature → 400, processWebhook never runs", async () => {
		const payment = mock<PaymentService>();
		const webhook = mock<PaymentWebhookService>();
		const ctrl = new PaymentController(payment, webhook);
		payment.handleWebhook.mockRejectedValue(new Error("bad sig"));
		const r = res();
		await ctrl.payosWebhook({ body: { code: "99" } }, r);
		expect(r.status).toHaveBeenCalledWith(400);
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
		expect(webhook.processWebhook).not.toHaveBeenCalled();
	});

	it("valid signature → processWebhook runs, 200 received", async () => {
		const payment = mock<PaymentService>();
		const webhook = mock<PaymentWebhookService>();
		const ctrl = new PaymentController(payment, webhook);
		const result = { ok: true } as any;
		payment.handleWebhook.mockResolvedValue(result);
		webhook.processWebhook.mockResolvedValue(undefined as any);
		const r = res();
		await ctrl.payosWebhook({ body: { code: "00" } }, r);
		expect(webhook.processWebhook).toHaveBeenCalledWith(result);
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
	});

	it("business error after valid signature → still 200 (no PayOS retry storm)", async () => {
		const payment = mock<PaymentService>();
		const webhook = mock<PaymentWebhookService>();
		const ctrl = new PaymentController(payment, webhook);
		payment.handleWebhook.mockResolvedValue({ ok: true } as any);
		webhook.processWebhook.mockRejectedValue(new Error("db down"));
		const r = res();
		await ctrl.payosWebhook({ body: { code: "00" } }, r);
		expect(r.status).not.toHaveBeenCalledWith(400);
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
	});
});
