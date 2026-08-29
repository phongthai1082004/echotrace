import { inject, injectable } from 'tsyringe';
import { Prisma } from '../../../generated/prisma/client.js';
import { OrderRepository } from './order.repository.js';
import {
	IdempotencyKeyType,
	PaymentPlan,
	TransactionType,
	OrderStatus,
	ReturnState,
	ReturnFault,
	DefectState,
	TransactionStatus,
	PaymentGateway,
	toOrderItem,
	parseCreateOrderDTO,
	CreatePaymentLinkDto,
	ErrorCode,
	PAYMENT_LINK_EXPIRY_MS,
	WebhookProcessResult,
} from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { ICartService } from '../cart/cart.service.js';
import { PaymentService } from '../../infrastructure/payment/payment.service.js';
import { PaymentWebhookService } from '../../features/payment/payment.service.js';
import { IOrderFinanceService } from './order-finance.service.js';
import { scheduleDelayedJob } from '../../infrastructure/queue/redis-delayed-queue.js';
import { restockOrderAlbums, sumNeedBySampleBook } from '../sample-books/stock.service.js';
import { PaymentLinkItem } from '@payos/node';
import { IPdfQueue } from '../pdf/pdf.types.js';

// ponytail: cache PayOS status a few seconds to avoid hammering the gateway on
// client polling. In-memory per process; swap for a shared cache if multi-instance.
const payStatusCache = new Map<number, { status: string | null; ts: number }>();
const PAY_STATUS_TTL_MS = 5000;
async function getCachedPaymentStatus(
	get: (g: PaymentGateway, c: number) => Promise<string | null>,
	gateway: PaymentGateway,
	orderCode: number,
): Promise<string | null> {
	const hit = payStatusCache.get(orderCode);
	const now = Date.now();
	if (hit && now - hit.ts < PAY_STATUS_TTL_MS) return hit.status;
	const status = await get(gateway, orderCode).catch(() => null);
	payStatusCache.set(orderCode, { status, ts: now });
	return status;
}

// ponytail: test seam — reset in unit tests since cache is process-wide (same orderCode across cases)
export function __resetPayStatusCache() {
	payStatusCache.clear();
}

export interface IOrderService {
	createOrder(idempotencyKey: string, requestBody: string, userId: number): Promise<any>;
	listMyOrders(userId: number): Promise<any[]>;
	listAllOrders(): Promise<any[]>;
	getOrderById(id: number): Promise<any>;
	adminUpdateOrder(id: number, patch: any): Promise<void>;
	processOrderEvent(id: number, type: string, payload: any): Promise<void>;
	createPaymentLink(orderId: number, userId: number): Promise<{ qrCode?: string; checkoutUrl?: string }>;
	verifyPayment(orderId: number, userId: number): Promise<string>;
	cancelOrder(orderId: number, userId: number): Promise<{ refunded: boolean; amount: number }>;
	requestReturn(
		orderId: number,
		userId: number,
		body: { reason?: string; items?: { index: number; quantity: number; defect?: string }[] },
	): Promise<void>;
	approveReturn(orderId: number, body: { fault: ReturnFault }): Promise<void>;
	markReshipped(orderId: number): Promise<void>;
	reportDefect(orderId: number, userId: number): Promise<void>;
	markDefective(orderId: number): Promise<void>;
}

@injectable()
export class OrderService implements IOrderService {
	constructor(
		@inject('ICartService') private cartService: ICartService,
		@inject('IPaymentService') private paymentService: PaymentService,
		@inject('IPaymentWebhookService') private webhookService: PaymentWebhookService,
		@inject('IOrderFinanceService') private finance: IOrderFinanceService,
		@inject('IPdfQueue') private pdfQueue: IPdfQueue,
		@inject('OrderRepository') private orderRepo: OrderRepository,
	) {}
	async createOrder(idempotencyKey: string, requestBody: string, userId: number): Promise<any> {
		const [existing, user] = await this.orderRepo.client.$transaction([
			this.orderRepo.getIdempotencyKey(idempotencyKey),
			this.orderRepo.getUserContact(userId),
		]);
		if (existing?.status === IdempotencyKeyType.SUCCESS && existing.responseBody) {
			return existing.responseBody;
		}
		if (existing?.status === IdempotencyKeyType.PROCESSING) {
			throw new AppError(ErrorCode.INTERNAL, 409);
		}
		if (existing) {
			await this.orderRepo.deleteIdempotencyKey(idempotencyKey); // FAILED → cho retry
		}
		await this.orderRepo.createIdempotencyKey(idempotencyKey, IdempotencyKeyType.PROCESSING);

		try {
			const createOrderDto = parseCreateOrderDTO(requestBody);

			// ponytail: validate thông tin khách ở trust boundary (frontend cũng validate)
			const vName = (createOrderDto.name ?? '').trim();
			const vPhone = (createOrderDto.phone ?? '').trim().replace(/[\s.-]/g, '').replace(/^\+84/, '0');
			const vAddress = (createOrderDto.address ?? '').trim();
			const vCity = (createOrderDto.city ?? '').trim();
			const custErr: string[] = [];
			if (vName.length < 2) custErr.push('Họ tên không hợp lệ');
			if (!/^0\d{8,10}$/.test(vPhone)) custErr.push('Số điện thoại không hợp lệ');
			if (vAddress.length < 5) custErr.push('Địa chỉ không hợp lệ');
			if (vCity.length < 2) custErr.push('Tỉnh/thành phố không hợp lệ');
			if (custErr.length) throw new AppError(custErr.join('; '), 400);

			const bookIds = createOrderDto.items.map((i) => i.bookId);
			const quote = await this.cartService.calculateCart(
				userId,
				createOrderDto.paymentMethod,
				createOrderDto.couponCode,
				bookIds,
			);
			// ponytail: check tồn kho trước khi tạo payment link (tránh orphan link khi hết hàng).
			// Dùng chung sumNeedBySampleBook với nhánh giảm tồn kho trong tx bên dưới.
			{
				const need0 = await sumNeedBySampleBook(bookIds, quote.items, this.orderRepo.client);
				if (need0.size) {
					const sms = await this.orderRepo.findSampleBooks([...need0.keys()]);
					for (const s of sms) {
						const need = need0.get(s.id) ?? 0;
						if (s.quantity != null && need > s.quantity) throw new AppError(`Vượt quá số lượng tồn kho (còn ${s.quantity}, cần ${need})`, 400);
					}
				}
			}
			const plan = createOrderDto.paymentMethod;
			const txnType = plan === PaymentPlan.HALF ? TransactionType.DEPOSIT : TransactionType.FULL_PAYMENT;
			const buyer = {
				name: createOrderDto.name || user?.name || '',
				email: user?.email || '',
				phone: createOrderDto.phone || user?.phone || '',
				address: [createOrderDto.address || user?.address, createOrderDto.city].filter(Boolean).join(', '),
			};
			const orderCode = this.createOrderCode();
			const base = process.env.NEXTAUTH_URL ?? `http://localhost:${process.env.BACKEND_PORT}`;
			const linkDto: CreatePaymentLinkDto = {
				orderCode,
				amount: quote.payNow,
				type: txnType,
				description: `DH ${orderCode}`.slice(0, 25),
				cancelUrl: `${base}${process.env.CANCEL_URL}`,
				returnUrl: `${base}${process.env.RETURN_URL}`,
				items: quote.items.map((item) => ({
					name: item.title.slice(0, 25),
					quantity: item.quantity,
					price: item.price ?? 0,
				})) as PaymentLinkItem[],
				buyerName: buyer.name,
				buyerEmail: buyer.email,
				buyerPhone: buyer.phone,
				buyerAddress: buyer.address,
				expiredAt: Math.floor((Date.now() + PAYMENT_LINK_EXPIRY_MS) / 1000),
			};
			const link = await this.paymentService.createPaymentLink(linkDto);

			const result = await this.orderRepo.client.$transaction(
				async (tx) => {
					// ponytail: giảm tồn kho atomic (WHERE quantity >= need) → không âm, race-safe.
					const needBySample = await sumNeedBySampleBook(bookIds, quote.items, tx);
					if (needBySample.size) {
						const samples = await this.orderRepo.findSampleBooks([...needBySample.keys()], tx);
						for (const s of samples) {
							const need = needBySample.get(s.id) ?? 0;
							if (s.quantity == null) continue; // unlimited
							const r = await this.orderRepo.updateSampleBookQuantity(s.id, need, tx);
							if (r.count === 0) throw new AppError('Vượt quá số lượng tồn kho', 400);
						}
					}

	// ponytail: snapshot only the slim OrderItem shape, not the whole CartItem.
	const itemsSnapshot = quote.items.map((item) => toOrderItem(item));
					const order = await this.orderRepo.createOrder(
						{
							orderCode: String(orderCode),
							userId,
							subTotal: quote.subtotal,
							discountAmount: quote.discount,
							totalAmount: quote.total,
							depositAmount: plan === PaymentPlan.HALF ? quote.payNow : 0,
							paidAmount: 0,
							paymentType: plan,
							status: OrderStatus.PENDING_PAYMENT,
							name: buyer.name || null,
							phone: buyer.phone || null,
							address: createOrderDto.address || null,
							city: createOrderDto.city || null,
							note: createOrderDto.note || null,
							couponCode: quote.coupon?.code ?? null,
							orderItems: itemsSnapshot as unknown as Prisma.InputJsonValue,
							qrCode: link.qrCode ?? null,
							checkoutUrl: link.checkoutUrl ?? null,
							expiredAt: new Date(Date.now() + PAYMENT_LINK_EXPIRY_MS),
						},
						tx,
					);
					await this.orderRepo.createTransaction(
						{
							orderId: order.id,
							idempotencyKeyId: idempotencyKey,
							gateway: link.gateway,
							gatewayTransactionCode: link.gatewayTransactionCode,
							type: txnType,
							amount: quote.payNow,
							paymentLinkId: link.gatewayTransactionCode,
							bankAccount: link.bankAccount ?? null,
							content: link.content ?? null,
							status: TransactionStatus.PENDING,
							transactionTime: new Date(),
							rawPayload: link.raw as any,
						},
						tx,
					);
					await this.orderRepo.deleteCartItems(userId, bookIds, tx);

					const responseBody = {
						orderId: order.id,
						orderCode: order.orderCode,
						status: order.status,
						checkoutUrl: link.checkoutUrl,
						qrCode: link.qrCode,
						payNow: quote.payNow,
						total: quote.total,
					};

					await this.orderRepo.markIdempotencySuccess(idempotencyKey, responseBody, tx);
					return responseBody;
				},
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 },
			);

			// ponytail: ném vào Redis delayed job, hết hạn chưa trả thì tự cancel
			scheduleDelayedJob('order_expiry', { orderId: result.orderId }, PAYMENT_LINK_EXPIRY_MS);

			// ponytail: enqueue PDF render job (async, không block response). Lỗi enqueue không fail order.
			this.pdfQueue.enqueue(result.orderId).catch(() => {});

			return result;
		} catch (error) {
			await this.orderRepo.markIdempotencyFailed(idempotencyKey).catch(() => {});
			throw error;
		}
	}

	// ponytail: tạo/làm mới link thanh toán cho đơn pending — để user mất mạng/out trang vẫn trả được
	async createPaymentLink(orderId: number, userId: number): Promise<{ qrCode?: string; checkoutUrl?: string }> {
		const order = await this.orderRepo.findOrderWithTransactions(orderId, userId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.status !== OrderStatus.PENDING_PAYMENT) {
			throw new AppError('Order is not pending payment', 400);
		}
		const now = Date.now();
		if (order.qrCode && order.checkoutUrl && order.expiredAt && order.expiredAt.getTime() > now) {
			return { qrCode: order.qrCode, checkoutUrl: order.checkoutUrl };
		}
		const gateway = (order.transactions[0]?.gateway ?? PaymentGateway.PAYOS) as PaymentGateway;
		const amount = order.depositAmount > 0 ? order.depositAmount : order.totalAmount;
		const base = process.env.NEXTAUTH_URL ?? `http://localhost:${process.env.BACKEND_PORT}`;
		// ponytail: get() của PayOS không trả qrCode, nên luôn create lại (cancel link cũ để tránh trùng orderCode)
		await this.paymentService.refund(gateway, Number(order.orderCode)).catch(() => {});
		const link = await this.paymentService.createPaymentLink({
			orderCode: Number(order.orderCode),
			amount,
			type: order.depositAmount > 0 ? TransactionType.DEPOSIT : TransactionType.FULL_PAYMENT,
			description: `DH ${order.orderCode}`.slice(0, 25),
			cancelUrl: `${base}${process.env.CANCEL_URL}`,
			returnUrl: `${base}${process.env.RETURN_URL}`,
			expiredAt: Math.floor((now + PAYMENT_LINK_EXPIRY_MS) / 1000),
		});
		const expiredAt = new Date(now + PAYMENT_LINK_EXPIRY_MS);
		await this.orderRepo.updateOrder(order.id, { qrCode: link?.qrCode ?? null, checkoutUrl: link?.checkoutUrl ?? null, expiredAt });
		scheduleDelayedJob('order_expiry', { orderId: order.id }, PAYMENT_LINK_EXPIRY_MS);
		return { qrCode: link?.qrCode ?? undefined, checkoutUrl: link?.checkoutUrl ?? undefined };
	}

	// ponytail: webhook PayOS chỉ gửi về URL public — localhost không nhận được.
	// Polling từ client gọi hàm này: hỏi PayOS status thật, nếu PAID thì áp dụng logic webhook (idempotent).
	async verifyPayment(orderId: number, userId: number): Promise<string> {
		const order = await this.orderRepo.findOrderWithTransactions(orderId, userId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.status !== OrderStatus.PENDING_PAYMENT) return order.status;

		const gateway = (order.transactions[0]?.gateway ?? PaymentGateway.PAYOS) as PaymentGateway;
		const remote = await getCachedPaymentStatus((g, c) => this.paymentService.getPaymentStatus(g, c), gateway, Number(order.orderCode));
		if (remote === 'PAID') {
			const result: WebhookProcessResult = {
				orderCode: String(order.orderCode),
				gateway,
				gatewayTransactionCode: order.transactions[0]?.gatewayTransactionCode ?? '',
				amount: order.transactions[0]?.amount ?? order.totalAmount,
				status: TransactionStatus.SUCCESS,
				transactionTime: new Date(),
				rawPayload: { verified: true },
				isValidSignature: true,
			};
			await this.webhookService.processWebhook(result);
		}
		const refreshed = await this.orderRepo.findOrderStatus(order.id);
		return refreshed?.status ?? order.status;
	}

	async listMyOrders(userId: number): Promise<any[]> {
		return this.orderRepo.listMyOrders(userId);
	}

	async listAllOrders(): Promise<any[]> {
		return this.orderRepo.listAllOrders();
	}

	async getOrderById(id: number): Promise<any> {
		// ponytail: same shape as listAllOrders so the FE can merge one row in place (B1).
		return this.orderRepo.getOrderById(id);
	}

	async adminUpdateOrder(id: number, patch: any): Promise<void> {
		const data: any = {};
		if (patch.status != null) {
			if (!Object.values(OrderStatus).includes(patch.status)) {
				throw new AppError(ErrorCode.INTERNAL, 400);
			}
			data.status = patch.status;
		}
		if (patch.supplierId !== undefined) data.supplierId = patch.supplierId;
		if (patch.trackingCode !== undefined) data.trackingCode = patch.trackingCode;
		// ponytail: admin tự set defectState (resolved sau khi xử lý xong). Validate enum.
		if (patch.defectState !== undefined) {
			if (!Object.values(DefectState).includes(patch.defectState)) throw new AppError(ErrorCode.INTERNAL, 400);
			data.defectState = patch.defectState;
		}
		if (Object.keys(data).length === 0) return;
		try {
			await this.orderRepo.updateOrder(id, data);
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
				throw new AppError(ErrorCode.NOT_FOUND, 404);
			}
			throw e;
		}
	}

	// ===== Admin order events: assign / ship / deliver / reconcile / refund =====
	private static ALLOWED: Record<string, string[]> = {
		pending_payment: [],
		paid: [], // phải assign trước → processing mới được ship
		partially_paid: [], // nhận cọc, chưa gán NCC
		processing: ['shipping'],
		shipping: ['delivered'],
		delivered: [],
		cancelled: [],
		refunding: ['refunded'],
		refunded: [],
	};

	private assertTransition(from: string, to: string): void {
		if (!OrderService.ALLOWED[from]?.includes(to)) {
			throw new AppError(ErrorCode.INTERNAL, 400); // transition không hợp lệ
		}
	}

	async processOrderEvent(id: number, type: string, payload: any): Promise<void> {
		const order = await this.orderRepo.findOrderById(id);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		switch (type) {
			case 'assign':
				return this.assignOrder(order, payload ?? {});
			case 'ship':
				return this.shipOrder(order);
			case 'deliver':
				return this.deliverOrder(order, payload ?? {});
			case 'reconcile_supplier':
				return this.reconcileSupplier(order, payload ?? {});
			case 'reconcile_cod':
				return this.reconcileCod(order);
			case 'refund':
				return this.refundOrder(order);
			case 'reconcile_refund':
				return this.reconcileRefund(order);
			default:
				throw new AppError(ErrorCode.INTERNAL, 400);
		}
	}

	private async assignOrder(order: any, payload: any): Promise<void> {
		if (order.supplierId != null || (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PARTIALLY_PAID)) {
			throw new AppError(ErrorCode.INTERNAL, 400); // chỉ assign 1 lần, từ PAID hoặc PARTIALLY_PAID
		}
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const patch = payload.items as Array<{ itemIndex: number; supplierId: number; costPrice: number }>;
		if (!Array.isArray(patch) || patch.length === 0) throw new AppError(ErrorCode.INTERNAL, 400);

		// ponytail: gán NCC do admin chịu trách nhiệm, bỏ supplierCanFulfill gây 400
		for (const p of patch) {
			const item = items[p.itemIndex];
			if (!item) throw new AppError(ErrorCode.NOT_FOUND, 404);
			items[p.itemIndex] = { ...item, supplierId: p.supplierId, costPrice: p.costPrice };
		}
		// ponytail: đơn nhiều NCC → order.supplierId không thể biểu diễn 1 NCC; chỉ set khi duy nhất.
		const supplierIds = Array.from(new Set(items.map((i: any) => i.supplierId).filter(Boolean)));
		const orderSupplier = supplierIds.length === 1 ? supplierIds[0] : null;
		await this.orderRepo.updateOrder(order.id, { orderItems: items, supplierId: orderSupplier, status: OrderStatus.PROCESSING });
	}

	private async shipOrder(order: any): Promise<void> {
		// ponytail: gán NCC đã ép ở transition PROCESSING (assertTransition). Đơn nhiều NCC có
		// order.supplierId = null (NCC lưu per-item) nên không check ở đây.
		this.assertTransition(order.status, OrderStatus.SHIPPING);
		await this.orderRepo.updateOrder(order.id, { status: OrderStatus.SHIPPING });
	}

	// ponytail: giao từng kiện (itemIndices). Đơn chỉ thành DELIVERED khi TẤT CẢ kiện đã giao; còn lại giữ SHIPPING (Partially Delivered)
	private async deliverOrder(order: any, payload: any): Promise<void> {
		if (order.status !== OrderStatus.SHIPPING) throw new AppError(ErrorCode.INTERNAL, 400);
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const idxSet = Array.isArray(payload?.itemIndices) ? new Set(payload.itemIndices as number[]) : null;
		const now = new Date().toISOString();
		let touched = false;
		for (let i = 0; i < items.length; i++) {
			const should = idxSet ? idxSet.has(i) : !items[i].deliveredAt;
			if (should && !items[i].deliveredAt) {
				items[i] = { ...items[i], deliveredAt: now };
				touched = true;
			}
		}
		if (!touched) return; // ponytail: deliver chỉ mark kiện chưa giao; không đổi status nếu chẳng có gì mới
		const allDelivered = items.length > 0 && items.every((it) => it.deliveredAt);
		// ponytail: ghi Income 1 lần tại DELIVERED (FULL + HALF đều vào đây). Atomic với order update.
		await this.orderRepo.client.$transaction(async (tx) => {
			await this.orderRepo.updateOrder(
				order.id,
				{ orderItems: items, status: allDelivered ? OrderStatus.DELIVERED : OrderStatus.SHIPPING },
				tx,
			);
			if (allDelivered) await this.finance.recognizeIncome(order.id, order.totalAmount, tx);
		});
	}

	private async reconcileCod(order: any): Promise<void> {
		if (order.status !== OrderStatus.DELIVERED) throw new AppError(ErrorCode.INTERNAL, 400);
		if (order.paymentType !== PaymentPlan.HALF) return; // FULL/HALF đều ghi Income tại DELIVERED
		if (order.codReconciledAt) return; // idempotent
		const codAmount = order.totalAmount - order.paidAmount;
		if (codAmount <= 0) return;
		// ponytail: chỉ Cashflow IN (thu COD); Income đã ghi tại DELIVERED.
		await this.orderRepo.client.$transaction(async (tx) => {
			await this.orderRepo.createCashflow({ type: 'IN', orderId: order.id, amount: codAmount, date: new Date(), note: 'Thu COD' }, tx);
			await this.orderRepo.updateOrder(order.id, { codReconciledAt: new Date() }, tx);
		});
	}

	private async reconcileSupplier(order: any, payload: any): Promise<void> {
		// ponytail: chỉ đối soát NCC khi đơn đang xử lý/giao/đã giao
		if (![OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.DELIVERED].includes(order.status)) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const idxSet = Array.isArray(payload.itemIndices)
			? new Set(payload.itemIndices as number[])
			: null;
		// ponytail: ứng viên = item đã gán NCC, chưa đối soát, và không phải lỗi nhà in (bỏ qua nếu returnFault=supplier)
		const candidates = items
			.map((it, i) => ({ it, i }))
			.filter(({ it, i }) => (idxSet ? idxSet.has(i) : true) && it.supplierId != null && !it.reconciledAt && it.returnFault !== 'supplier');

		// ponytail: phải nhập giá đã trả NCC (>0) cho TẤT CẢ item trước khi đối soát
		const missingCost = candidates.filter(
			({ it }) => it.costPrice == null || Number.isNaN(Number(it.costPrice)) || Number(it.costPrice) <= 0,
		);
		if (missingCost.length > 0) throw new AppError('MISSING_SUPPLIER_COST', 400);

		// group by supplier
		const bySupplier = new Map<number, { amount: number; indices: number[] }>();
		for (const { it, i } of candidates) {
			const cur = bySupplier.get(it.supplierId) ?? { amount: 0, indices: [] };
			cur.amount += Number(it.costPrice);
			cur.indices.push(i);
			bySupplier.set(it.supplierId, cur);
		}
		if (bySupplier.size === 0) return;

		await this.orderRepo.client.$transaction(async (tx) => {
			// ponytail: batch lookup suppliers 1 lần thay vì findUnique mỗi NCC (N+1)
			const supplierIds = [...bySupplier.keys()];
			const sups = supplierIds.length ? await this.orderRepo.findSuppliersByIds(supplierIds, tx) : [];
			const supById = new Map(sups.map((s: any) => [s.id, s]));
			for (const [supplierId, grp] of bySupplier) {
				const sup = supById.get(supplierId);
				await this.finance.recordOutflow(tx, order.id, grp.amount, 'SUPPLIER', `Trả NCC ${sup?.name ?? supplierId} (đơn ${order.orderCode})`, sup?.name ?? undefined);
				for (const i of grp.indices) {
					items[i] = { ...items[i], reconciledAt: new Date().toISOString() };
				}
			}
			await this.orderRepo.updateOrder(order.id, { orderItems: items }, tx);
		});
	}

	private async refundOrder(order: any): Promise<void> {
		if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PARTIALLY_PAID) {
			throw new AppError(ErrorCode.INTERNAL, 400); // hoàn tiền chỉ khi paid hoặc partially_paid
		}
		const refundAmount = order.paidAmount;
		// ponytail: PayOS SDK chỉ cancel đc link đang pending; đã thanh toán thì cần hoàn thủ công trên PayOS
		try {
			await this.paymentService.refund(PaymentGateway.PAYOS, Number(order.orderCode));
		} catch {
			/* best-effort */
		}
		await this.orderRepo.client.$transaction(async (tx) => {
			await this.finance.recordOutflow(tx, order.id, refundAmount, 'OTHER', `Hoàn tiền khách (đơn ${order.orderCode})`);
			// đánh dấu txn đã hoàn để reconcile_refund đối soát
			await this.orderRepo.markTransactionsRefunded(order.id, tx);
			// ponytail: status refunding chờ admin đối soát, mới thành refunded
			await this.orderRepo.updateOrder(order.id, { status: OrderStatus.REFUNDING }, tx);
		});
	}

	// ponytail: customer cancel. Refund (Expense + cashflow OUT) only if order hasn't reached PROCESSING yet.
	async cancelOrder(orderId: number, userId: number): Promise<{ refunded: boolean; amount: number }> {
		const order = await this.orderRepo.findOrderWithTransactions(orderId, userId, );
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (!['pending_payment', 'paid', 'partially_paid', 'processing', 'shipping'].includes(order.status)) {
			throw new AppError('Order cannot be cancelled', 400);
		}
		const beforeProcess = order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.PAID || order.status === OrderStatus.PARTIALLY_PAID;
		if (beforeProcess && order.paidAmount > 0) {
			const amount = order.paidAmount;
			try {
				await this.paymentService.refund(PaymentGateway.PAYOS, Number(order.orderCode));
			} catch {
				/* best-effort: PayOS link đã paid → hoàn thủ công, Expense vẫn ghi nhận */
			}
			await this.orderRepo.client.$transaction(async (tx) => {
				await this.orderRepo.markTransactionsRefunded(order.id, tx);
				await this.finance.recordOutflow(tx, order.id, amount, 'OTHER', `Hoàn tiền khách (đơn ${order.orderCode})`);
				await this.orderRepo.updateOrder(order.id, { status: OrderStatus.REFUNDING }, tx);
			});
			return { refunded: true, amount };
		}
		// ponytail: user huỷ trước thanh toán (PENDING_PAYMENT chưa trả) → hoàn tồn kho album (atomic với cancel)
		if (order.status === OrderStatus.PENDING_PAYMENT) {
			await this.orderRepo.client.$transaction(async (tx) => {
				await restockOrderAlbums(order.orderItems, tx);
				await this.orderRepo.updateOrder(order.id, { status: OrderStatus.CANCELLED }, tx);
			});
			return { refunded: false, amount: 0 };
		}
		await this.orderRepo.updateOrder(order.id, { status: OrderStatus.CANCELLED });
		return { refunded: false, amount: 0 };
	}

	// ===== Return / Warranty (bảo hành = giao lại quyển khác) =====
	// ponytail: "hoàn" thực chất là bảo hành giao lại. KHÔNG gọi PayOS, KHÔNG trả tiền khách.
	// Khách báo lỗi + số quyển; mình giao lại và chỉ reconcile (ghi Expense) phần đó.
	// SELF -> ghi Expense bản thay thế (mình trả NCC); SUPPLIER -> nhà in chịu, bỏ qua Expense.
	async requestReturn(
		orderId: number,
		userId: number,
		body: { reason?: string; items?: { index: number; quantity: number; defect?: string }[] },
	): Promise<void> {
		const order = await this.orderRepo.findOrderForUser(orderId, userId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.SHIPPING) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		if (order.returnState && order.returnState !== ReturnState.NONE) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const reported = body.items ?? items.map((_, i) => ({ index: i, quantity: items[i]?.quantity ?? 1, defect: undefined }));
		// ponytail: đánh dấu từng item lỗi để admin duyệt + reconcile đúng phần
		for (const r of reported) {
			if (r.index < 0 || r.index >= items.length || !Number.isInteger(r.quantity) || r.quantity <= 0) {
				throw new AppError(ErrorCode.INTERNAL, 400);
			}
			items[r.index] = { ...items[r.index], defective: true, returnQty: r.quantity, returnDefect: r.defect ?? null };
		}
		await this.orderRepo.updateOrder(orderId, { returnState: ReturnState.REQUESTED, returnReason: body.reason ?? null, orderItems: items });
	}

	async approveReturn(orderId: number, body: { fault: ReturnFault }): Promise<void> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.returnState !== ReturnState.REQUESTED) throw new AppError(ErrorCode.INTERNAL, 400);

		const fault = body.fault === ReturnFault.SUPPLIER ? ReturnFault.SUPPLIER : ReturnFault.SELF;
		// ponytail: chỉ đánh dấu item lỗi nhà in (returnFault='supplier') để reconcileSupplier bỏ qua;
		// item lỗi thường (SELF) vẫn để reconcile bình thường (NCC được trả tiền bản thay thế).
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		for (const it of items) {
			if (it.defective && fault === ReturnFault.SUPPLIER) it.returnFault = 'supplier';
		}
		await this.orderRepo.updateOrder(orderId, { returnFault: fault, orderItems: items, returnState: ReturnState.RESHIPPING });
	}

	async markReshipped(orderId: number): Promise<void> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.returnState !== ReturnState.RESHIPPING) throw new AppError(ErrorCode.INTERNAL, 400);
		// ponytail: SELF -> ghi Expense bản thay thế (reconcile chỗ đó); SUPPLIER -> nhà in chịu, không ghi
		if (order.returnFault === ReturnFault.SELF) {
			const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
			const amount = items
				.filter((it) => it.defective)
				.reduce((sum, it) => sum + (Number(it.costPrice) || 0) * (Number(it.returnQty) || Number(it.quantity) || 0), 0);
			await this.orderRepo.client.$transaction(async (tx) => {
				if (amount > 0) {
					await this.finance.recordOutflow(tx, order.id, amount, 'OTHER', `Bảo hành giao lại (đơn ${order.orderCode})`);
				}
				await this.orderRepo.updateOrder(order.id, { returnState: ReturnState.RESHIPPED }, tx);
			});
		} else {
			await this.orderRepo.updateOrder(orderId, { returnState: ReturnState.RESHIPPED });
		}
	}

	// ponytail: hàng lỗi = 1 state (không phải status chính). KHÔNG ghi Expense tự động —
	// admin tự tạo Expense category=DEFECTIVE ("Ship hàng lỗi"), trigger lo counters.
	async reportDefect(orderId: number, userId: number): Promise<void> {
		const order = await this.orderRepo.findOrderForUser(orderId, userId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.status !== OrderStatus.DELIVERED) throw new AppError(ErrorCode.INTERNAL, 400);
		if (order.defectState && order.defectState !== DefectState.NONE) throw new AppError(ErrorCode.INTERNAL, 400);
		await this.orderRepo.updateOrder(orderId, { defectState: DefectState.REPORTED });
	}

	async markDefective(orderId: number): Promise<void> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.status !== OrderStatus.DELIVERED) throw new AppError(ErrorCode.INTERNAL, 400);
		if (order.defectState && order.defectState !== DefectState.NONE) throw new AppError(ErrorCode.INTERNAL, 400);
		await this.orderRepo.updateOrder(orderId, { defectState: DefectState.REPORTED });
	}

	// ponytail: admin đối soát đơn đã refund — đánh dấu các txn đã hoàn (đã trả thủ công trên PayOS) đã reconciled.
	// Dùng updateMany 1 phát thay vì loop update từng txn (N9); cờ reconciledAt là cột thật, thay vì json rawPayload.
	private async reconcileRefund(order: any): Promise<void> {
		if (order.status !== OrderStatus.REFUNDING) throw new AppError(ErrorCode.INTERNAL, 400);
		await this.orderRepo.client.$transaction(async (tx) => {
			await this.orderRepo.markTransactionsRefunded(order.id, tx);
			await this.orderRepo.updateOrder(order.id, { status: OrderStatus.REFUNDED }, tx);
		});
	}

	private createOrderCode(): number {
		// ponytail: timestamp + 3‑digit random; collision extremely unlikely,
		// and @unique on orderCode prevents dupes if it happens.
		return Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
	}
}
