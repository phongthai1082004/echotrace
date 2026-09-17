/**
 * Part 1/P1 — CheckoutService: idempotency, validation, album UTM override.
 * All collaborators mocked; repo tx runs inline like order-state-machine tests.
 */
import { mock } from "jest-mock-extended";
import { CheckoutService } from "../../../src/modules/order-cart/checkout/checkout.service.js";
import { OrderRepository } from "../../../src/modules/order-cart/repositories/order.repository.js";
import type { ICartService } from "../../../src/modules/order-cart/cart/cart.service.js";
import type { PaymentService } from "../../../src/modules/financial/payments/gateways/payment.service.js";
import type { IPdfQueue } from "../../../src/modules/pdf/render/pdf.types.js";
import type { IStockService } from "../../../src/modules/product/sample-books/stock.service.js";
import type { ISampleBookService } from "../../../src/modules/product/sample-books/sample-books.service.js";
import type { ICouponService } from "../../../src/modules/order-cart/coupons/coupons.service.js";
import type { NotificationSubject } from "../../../src/modules/notification/notification.subject.js";
import { IdempotencyKeyType, OrderStatus, PaymentPlan } from "@echotrace/shared";

const validBody = () =>
	JSON.stringify({
		items: [{ bookId: 1, quantity: 1, cover: "soft", paper: "matt", paperSize: "A4" }],
		name: "Nguyen Van A",
		phone: "0912345678",
		address: "123 Duong ABC",
		city: "Ha Noi",
		paymentMethod: PaymentPlan.FULL,
	});

const build = () => {
	const orderRepo = mock<OrderRepository>();
	// ponytail: service dùng cả 2 kiểu $transaction — array (đọc idempotency)
	// lẫn callback (ghi đơn). Mock cover cả hai.
	(orderRepo as any).client = {
		$transaction: jest.fn((ops: any, _opts?: any) => (Array.isArray(ops) ? Promise.all(ops) : ops({}))),
	};
	const cart = mock<ICartService>();
	const payment = mock<PaymentService>();
	const pdf = mock<IPdfQueue>();
	pdf.enqueue.mockResolvedValue(undefined as any); // ponytail: mock-extended trả undefined, src cần Promise để .catch
	const stock = mock<IStockService>();
	const samples = mock<ISampleBookService>();
	const coupons = mock<ICouponService>();
	const subject = mock<NotificationSubject>();
	const svc = new CheckoutService(cart as any, payment, pdf, orderRepo, stock, samples, coupons, subject);

	orderRepo.getIdempotencyKey.mockResolvedValue(null);
	orderRepo.getUserContact.mockResolvedValue({ name: "A", email: "a@b.c", phone: "0912345678", address: "X" });
	orderRepo.createIdempotencyKey.mockResolvedValue({} as any);
	orderRepo.deleteIdempotencyKey.mockResolvedValue({} as any);
	(cart as any).calculateCart.mockResolvedValue({
		subtotal: 100,
		discount: 0,
		total: 100,
		payNow: 100,
		items: [{ bookId: 1, quantity: 1, title: "B", pages: 10, cover: "soft", paper: "matt", paperSize: "A4", price: 100 }],
		coupon: null,
	});
	stock.sumNeedBySampleBook.mockResolvedValue(new Map());
	payment.createPaymentLink.mockResolvedValue({
		qrCode: "qr",
		checkoutUrl: "url",
		gateway: "PAYOS",
		gatewayTransactionCode: "T1",
		raw: {},
	} as any);
	orderRepo.findBooksAttribution.mockResolvedValue([]);
	orderRepo.createOrder.mockResolvedValue({ id: 11, orderCode: "C1", status: OrderStatus.PENDING_PAYMENT } as any);
	orderRepo.createTransaction.mockResolvedValue({} as any);
	orderRepo.deleteCartItems.mockResolvedValue({} as any);
	orderRepo.markIdempotencySuccess.mockResolvedValue({} as any);
	orderRepo.markIdempotencyFailed.mockResolvedValue({} as any);
	orderRepo.updateOrder.mockResolvedValue({} as any); // ponytail: src gọi .catch lên Promise này (C-5)
	coupons.validateAndIncrementCoupon.mockResolvedValue(undefined as any);
	return { svc, orderRepo, cart, payment, stock, samples, coupons, subject };
};

describe("createOrder idempotency", () => {
	it("C-1: SUCCESS replay returns cached body, creates nothing", async () => {
		const { svc, orderRepo } = build();
		const cached = { orderId: 9, status: "paid" };
		orderRepo.getIdempotencyKey.mockResolvedValue({ status: IdempotencyKeyType.SUCCESS, responseBody: cached } as any);
		await expect(svc.createOrder("k1", validBody(), 5)).resolves.toEqual(cached);
		expect(orderRepo.createOrder).not.toHaveBeenCalled();
		expect(orderRepo.createIdempotencyKey).not.toHaveBeenCalled();
	});

	it("C-2: PROCESSING → 409, no retry", async () => {
		const { svc, orderRepo } = build();
		orderRepo.getIdempotencyKey.mockResolvedValue({ status: IdempotencyKeyType.PROCESSING } as any);
		await expect(svc.createOrder("k2", validBody(), 5)).rejects.toMatchObject({ statusCode: 409 });
		expect(orderRepo.createOrder).not.toHaveBeenCalled();
	});

	it("C-3: FAILED deletes key then proceeds, order created once", async () => {
		const { svc, orderRepo } = build();
		orderRepo.getIdempotencyKey.mockResolvedValue({ status: "failed" } as any);
		const r = await svc.createOrder("k3", validBody(), 5);
		expect(orderRepo.deleteIdempotencyKey).toHaveBeenCalledWith("k3");
		expect(orderRepo.createOrder).toHaveBeenCalledTimes(1);
		expect(r).toMatchObject({ orderId: 11 });
		expect(orderRepo.markIdempotencySuccess).toHaveBeenCalledWith(
			"k3",
			expect.objectContaining({ orderId: 11 }),
			expect.anything(),
		);
	});

	it("C-4: invalid phone → 400, marks FAILED", async () => {
		const { svc, orderRepo } = build();
		const bad = JSON.parse(validBody());
		bad.phone = "123";
		await expect(svc.createOrder("k4", JSON.stringify(bad), 5)).rejects.toMatchObject({ statusCode: 400 });
		expect(orderRepo.createOrder).not.toHaveBeenCalled();
		expect(orderRepo.markIdempotencyFailed).toHaveBeenCalledWith("k4");
	});
});

describe("createAlbumOrder UTM override", () => {
	const albumInput = (extra: any = {}) => ({
		customerId: 5,
		sampleBookId: 3,
		quantity: 1,
		name: "Nguyen Van A", // ponytail: src validate tên >= 2 ký tự
		phone: "0912345678",
		address: "123 Duong ABC",
		city: "Ha Noi",
		paymentMethod: PaymentPlan.FULL,
		...extra,
	});

	const wireAlbum = (b: ReturnType<typeof build>) => {
		b.samples.getPublishedById.mockResolvedValue({ id: 3, type: "ALBUM" } as any);
		(b.cart as any).addAlbumToCart.mockResolvedValue({ bookId: 1, quantity: 1, cover: "soft", paper: null, paperSize: null });
	};

	it("C-5: utmSource override stamps order, skips admin fan-out", async () => {
		const b = build();
		wireAlbum(b);
		const r = await b.svc.createAlbumOrder(albumInput({ utmSource: "Instagram", utmCampaign: "tet" }));
		expect(r).toMatchObject({ orderId: 11 });
		expect(b.orderRepo.updateOrder).toHaveBeenCalledWith(
			11,
			expect.objectContaining({ utmSource: "instagram", utmCampaign: "tet" }),
		);
		expect(b.subject.notify).not.toHaveBeenCalled();
	});

	it("C-6: no override → inherits book UTM, no update", async () => {
		const b = build();
		wireAlbum(b);
		b.orderRepo.findBooksAttribution.mockResolvedValue([
			{ id: 1, utmSource: "facebook", utmMedium: "cpc", utmCampaign: null },
		] as any);
		await b.svc.createAlbumOrder(albumInput());
		expect(b.orderRepo.createOrder).toHaveBeenCalledWith(
			expect.objectContaining({ utmSource: "facebook", utmMedium: "cpc" }),
			expect.anything(),
		);
		expect(b.orderRepo.updateOrder).not.toHaveBeenCalled();
	});
});
