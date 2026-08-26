import { inject, injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
	IdempotencyKeyType,
	PaymentPlan,
	TransactionType,
	OrderStatus,
	TransactionStatus,
	PaymentGateway,
	makeSku,
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
import { scheduleDelayedJob } from '../../infrastructure/queue/redis-delayed-queue.js';
import { PaymentLinkItem } from '@payos/node';

export abstract class IOrderService {
	abstract createOrder(idempotencyKey: string, requestBody: string, userId: number): Promise<any>;
	abstract listMyOrders(userId: number): Promise<any[]>;
	abstract listAllOrders(): Promise<any[]>;
	abstract adminUpdateOrder(id: number, patch: any): Promise<void>;
	abstract processOrderEvent(id: number, type: string, payload: any): Promise<void>;
	abstract createPaymentLink(orderId: number, userId: number): Promise<{ qrCode?: string; checkoutUrl?: string }>;
	abstract verifyPayment(orderId: number, userId: number): Promise<string>;
	abstract cancelOrder(orderId: number, userId: number): Promise<{ refunded: boolean; amount: number }>;
}

@injectable()
export class OrderService implements IOrderService {
	constructor(
		@inject('ICartService') private cartService: ICartService,
		@inject('IPaymentService') private paymentService: PaymentService,
		@inject('IPaymentWebhookService') private webhookService: PaymentWebhookService,
	) {}

	async createOrder(idempotencyKey: string, requestBody: string, userId: number): Promise<any> {
		const [existing, user] = await prisma.$transaction([
			prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } }),
			prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, phone: true, address: true } }),
		]);
		if (existing?.status === IdempotencyKeyType.SUCCESS && existing.responseBody) {
			return existing.responseBody;
		}
		if (existing?.status === IdempotencyKeyType.PROCESSING) {
			throw new AppError(ErrorCode.INTERNAL, 409);
		}
		if (existing) {
			await prisma.idempotencyKey.delete({ where: { key: idempotencyKey } }); // FAILED → cho retry
		}
		await prisma.idempotencyKey.create({ data: { key: idempotencyKey, status: IdempotencyKeyType.PROCESSING } });

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

			const result = await prisma.$transaction(
				async (tx) => {
					const itemsSnapshot = quote.items.map((item) => ({
						...item,
						sku: makeSku(item.cover, item.paper ?? '', item.paperSize ?? ''),
					}));
					const order = await tx.order.create({
						data: {
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
							orderItems: itemsSnapshot,
							qrCode: link.qrCode ?? null,
							checkoutUrl: link.checkoutUrl ?? null,
							expiredAt: new Date(Date.now() + PAYMENT_LINK_EXPIRY_MS),
						},
					});
					await tx.transaction.create({
						data: {
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
					});
					await tx.cartItem.deleteMany({
						where: { cart: { userId }, bookId: { in: bookIds } },
					});

					const responseBody = {
						orderId: order.id,
						orderCode: order.orderCode,
						status: order.status,
						checkoutUrl: link.checkoutUrl,
						qrCode: link.qrCode,
						payNow: quote.payNow,
						total: quote.total,
					};

					await tx.idempotencyKey.update({
						where: { key: idempotencyKey },
						data: { status: IdempotencyKeyType.SUCCESS, responseBody },
					});
					return responseBody;
				},
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 },
			);

			// ponytail: ném vào Redis delayed job, hết hạn chưa trả thì tự cancel
			scheduleDelayedJob('order_expiry', { orderId: result.orderId }, PAYMENT_LINK_EXPIRY_MS);

			return result;
		} catch (error) {
			await prisma.idempotencyKey
				.update({ where: { key: idempotencyKey }, data: { status: IdempotencyKeyType.FAILED } })
				.catch(() => {});
			throw error;
		}
	}

	// ponytail: tạo/làm mới link thanh toán cho đơn pending — để user mất mạng/out trang vẫn trả được
	async createPaymentLink(orderId: number, userId: number): Promise<{ qrCode?: string; checkoutUrl?: string }> {
		const order = await prisma.order.findFirst({
			where: { id: orderId, userId, isDelete: false },
			include: { transactions: { orderBy: { id: 'desc' }, take: 1 } },
		});
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
		await prisma.order.update({
			where: { id: order.id },
			data: { qrCode: link?.qrCode ?? null, checkoutUrl: link?.checkoutUrl ?? null, expiredAt },
		});
		scheduleDelayedJob('order_expiry', { orderId: order.id }, PAYMENT_LINK_EXPIRY_MS);
		return { qrCode: link?.qrCode ?? undefined, checkoutUrl: link?.checkoutUrl ?? undefined };
	}

	// ponytail: webhook PayOS chỉ gửi về URL public — localhost không nhận được.
	// Polling từ client gọi hàm này: hỏi PayOS status thật, nếu PAID thì áp dụng logic webhook (idempotent).
	async verifyPayment(orderId: number, userId: number): Promise<string> {
		const order = await prisma.order.findFirst({
			where: { id: orderId, userId, isDelete: false },
			include: { transactions: { orderBy: { id: 'desc' }, take: 1 } },
		});
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.status !== OrderStatus.PENDING_PAYMENT) return order.status;

		const gateway = (order.transactions[0]?.gateway ?? PaymentGateway.PAYOS) as PaymentGateway;
		const remote = await this.paymentService.getPaymentStatus(gateway, Number(order.orderCode)).catch(() => null);
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
		const refreshed = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
		return refreshed?.status ?? order.status;
	}

	async listMyOrders(userId: number): Promise<any[]> {
		return prisma.order.findMany({
			where: { userId, isDelete: false },
			orderBy: { createdAt: 'desc' },
		});
	}

	async listAllOrders(): Promise<any[]> {
		return prisma.order.findMany({
			where: { isDelete: false },
			orderBy: { createdAt: 'desc' },
			include: {
				user: { select: { id: true, name: true, email: true } },
				supplier: { select: { id: true, name: true, contact: true, email: true } },
			},
		});
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
		if (Object.keys(data).length === 0) return;
		try {
			await prisma.order.update({ where: { id }, data });
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
		const order = await prisma.order.findUnique({ where: { id } });
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
		const firstSupplier = items.find((i) => i.supplierId)?.supplierId ?? null;
		await prisma.order.update({
			where: { id: order.id },
			data: { orderItems: items, supplierId: firstSupplier, status: OrderStatus.PROCESSING },
		});
	}

	private async shipOrder(order: any): Promise<void> {
		if (!order.supplierId) throw new AppError(ErrorCode.INTERNAL, 400); // phải assign NCC trước khi ship
		this.assertTransition(order.status, OrderStatus.SHIPPING);
		await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.SHIPPING } });
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
		await prisma.order.update({
			where: { id: order.id },
			data: { orderItems: items, status: allDelivered ? OrderStatus.DELIVERED : OrderStatus.SHIPPING },
		});
	}

	private async reconcileCod(order: any): Promise<void> {
		if (order.status !== OrderStatus.DELIVERED) throw new AppError(ErrorCode.INTERNAL, 400);
		if (order.paymentType !== PaymentPlan.HALF) return; // FULL đã ghi Income lúc webhook
		if (order.codReconciledAt) return; // idempotent
		const codAmount = order.totalAmount - order.paidAmount;
		if (codAmount <= 0) return;
		await prisma.$transaction(async (tx) => {
			await tx.income.create({
				data: { orderId: order.id, amount: order.totalAmount, receivedAt: new Date(), note: 'Doanh thu (HALF) sau giao hàng' },
			});
			await tx.cashflow.create({
				data: { type: 'IN', orderId: order.id, amount: codAmount, date: new Date(), note: 'Thu COD' },
			});
			await tx.order.update({ where: { id: order.id }, data: { codReconciledAt: new Date() } });
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
		const targets = items
			.map((it, i) => ({ it, i }))
			.filter(({ it, i }) => (idxSet ? idxSet.has(i) : true) && it.supplierId != null && it.costPrice != null && !it.reconciledAt);

		// group by supplier
		const bySupplier = new Map<number, { amount: number; indices: number[] }>();
		for (const { it, i } of targets) {
			const cur = bySupplier.get(it.supplierId) ?? { amount: 0, indices: [] };
			cur.amount += Number(it.costPrice);
			cur.indices.push(i);
			bySupplier.set(it.supplierId, cur);
		}
		if (bySupplier.size === 0) return;

		await prisma.$transaction(async (tx) => {
			for (const [supplierId, grp] of bySupplier) {
				const sup = await tx.supplier.findUnique({ where: { id: supplierId } });
				const expense = await tx.expense.create({
					data: {
						orderId: order.id,
						amount: grp.amount,
						category: 'OTHER', // ponytail: enum chưa có SUPPLIER
						date: new Date(),
						supplierName: sup?.name ?? null,
						note: `Chi phí NCC đơn ${order.orderCode}`,
					},
				});
				await tx.cashflow.create({
					data: { type: 'OUT', expenseId: expense.id, orderId: order.id, amount: grp.amount, date: new Date(), note: `Trả NCC ${sup?.name ?? supplierId}` },
				});
				for (const i of grp.indices) {
					items[i] = { ...items[i], reconciledAt: new Date().toISOString() };
				}
			}
			await tx.order.update({ where: { id: order.id }, data: { orderItems: items } });
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
		await prisma.$transaction(async (tx) => {
			const expense = await tx.expense.create({
				data: { orderId: order.id, amount: refundAmount, category: 'OTHER', date: new Date(), note: `Hoàn tiền đơn ${order.orderCode}` },
			});
			await tx.cashflow.create({
				data: { type: 'OUT', expenseId: expense.id, orderId: order.id, amount: refundAmount, date: new Date(), note: 'Hoàn tiền khách' },
			});
			// đánh dấu txn đã hoàn để reconcile_refund đối soát
			const txns = await tx.transaction.findMany({ where: { orderId: order.id, status: TransactionStatus.SUCCESS } });
			for (const tr of txns) {
				await tx.transaction.update({ where: { id: tr.id }, data: { status: TransactionStatus.REFUNDED } });
			}
			// ponytail: status refunding chờ admin đối soát, mới thành refunded
			await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.REFUNDING } });
		});
	}

	// ponytail: customer cancel. Refund (Expense + cashflow OUT) only if order hasn't reached PROCESSING yet.
	async cancelOrder(orderId: number, userId: number): Promise<{ refunded: boolean; amount: number }> {
		const order = await prisma.order.findFirst({
			where: { id: orderId, userId, isDelete: false },
			include: { transactions: { where: { status: TransactionStatus.SUCCESS }, orderBy: { id: 'desc' } } },
		});
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
			await prisma.$transaction(async (tx) => {
				for (const tr of order.transactions) {
					await tx.transaction.update({ where: { id: tr.id }, data: { status: TransactionStatus.REFUNDED } });
				}
				const expense = await tx.expense.create({
					data: { orderId: order.id, amount, category: 'OTHER', date: new Date(), note: `Hoàn tiền đơn ${order.orderCode}` },
				});
				await tx.cashflow.create({
					data: { type: 'OUT', expenseId: expense.id, orderId: order.id, amount, date: new Date(), note: 'Hoàn tiền khách' },
				});
				await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.REFUNDING } });
			});
			return { refunded: true, amount };
		}
		await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
		return { refunded: false, amount: 0 };
	}

	// ponytail: admin đối soát đơn đã refund — đánh dấu txn đã reconciled (hoàn tiền thủ công trên PayOS)
	private async reconcileRefund(order: any): Promise<void> {
		if (order.status !== OrderStatus.REFUNDING) throw new AppError(ErrorCode.INTERNAL, 400);
		await prisma.$transaction(async (tx) => {
			const txns = await tx.transaction.findMany({ where: { orderId: order.id, status: TransactionStatus.REFUNDED } });
			for (const tr of txns) {
				const raw = { ...(tr.rawPayload as any), reconciled: true, reconciledAt: new Date().toISOString() };
				await tx.transaction.update({ where: { id: tr.id }, data: { rawPayload: raw as any } });
			}
			await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.REFUNDED } });
		});
	}

	private createOrderCode(): number {
		const now = new Date();
		const p = (n: number, w = 2) => String(n).padStart(w, '0');
		const ymd = `${p(now.getFullYear() % 100)}${p(now.getMonth() + 1)}${p(now.getDate())}`;
		const hms = `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
		return Number(`${ymd}${hms}${now.getMilliseconds() % 10}`);
	}
}
