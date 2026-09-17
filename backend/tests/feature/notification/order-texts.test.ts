/**
 * order-texts: every key renders vi/en/es, vi byte-identical to legacy strings.
 */
import { orderText, type OrderTextKey } from "../../../src/modules/notification/notify/order-texts.js";

const VARS = { code: "C1", amount: 1500000, total: 2000000, paid: 1000000, rest: 1000000, name: "An", reason: "rách bìa", status: "shipping" };

const KEYS: OrderTextKey[] = [
	"processing", "shipping", "delivered", "pendingRefund", "cancelRefundUser", "cancelRefundAdmin",
	"cancelledUser", "cancelUnpaidAdmin", "cancelProcessingAdmin", "refunded", "forceStatus",
	"returnRequestedAdmin", "returnApproved", "reshipped", "defectNoted", "newOrderAdmin",
	"paidFull", "deposit",
];

describe("orderText", () => {
	it("every key: vi/en/es title+message non-empty", () => {
		for (const k of KEYS) {
			const t = orderText(k, VARS);
			for (const lang of ["vi", "en", "es"] as const) {
				expect(t.i18n.title[lang]?.length).toBeGreaterThan(0);
				expect(t.i18n.message[lang]?.length).toBeGreaterThan(0);
			}
			expect(t.title).toBe(t.i18n.title.vi);
			expect(t.message).toBe(t.i18n.message.vi);
		}
	});

	it("vi identical to legacy production strings", () => {
		expect(orderText("processing", VARS).title).toBe("Đơn C1 đang được xử lý");
		expect(orderText("shipping", VARS).message).toBe("<p>Đơn <b>C1</b> đang trên đường giao tới bạn.</p>");
		expect(orderText("cancelRefundUser", VARS).message).toContain("1.500.000đ");
		expect(orderText("returnRequestedAdmin", VARS).message).toContain(": rách bìa");
		expect(orderText("returnRequestedAdmin", { code: "C1", reason: "" }).message).not.toContain(":");
		expect(orderText("paidFull", { code: "C1", paid: 1000000 }).title).toBe("Đã nhận thanh toán đơn C1");
	});

	it("en/es are translated, not copies of vi", () => {
		const t = orderText("delivered", VARS);
		expect(t.i18n.title.en).not.toBe(t.i18n.title.vi);
		expect(t.i18n.title.es).not.toBe(t.i18n.title.vi);
		expect(t.i18n.message.en).toContain("C1");
		expect(t.i18n.message.es).toContain("C1");
	});
});
