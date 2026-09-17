import { inject, injectable } from 'tsyringe';
import { Prisma } from '../../../../generated/prisma/client.js';
import { OrderRepository } from '../repositories/order.repository.js';
import {
	PaymentPlan,
	TransactionType,
	OrderStatus,
	DefectState,
	TransactionStatus,
	PaymentGateway,
	ErrorCode,
	PAYMENT_LINK_EXPIRY_MS,
	WebhookProcessResult,
	NotificationChannel,
	NotificationType,
} from '@echotrace/shared';
import { AppError } from '../../../shared/middleware/app.error.js';
import { PaymentService } from '../../financial/payments/gateways/payment.service.js';
import { PaymentWebhookService } from '../../financial/payments/payment.service.js';
import type {IOrderFinanceService} from '../../financial/settlement/order-finance.bridge.js';
import { scheduleDelayedJob } from '../queue/redis-delayed-queue.js';
import type {IStockService} from '../../product/sample-books/stock.service.js';
import { NotificationSubject } from '../../notification/notification.subject.js';
import { notifyOrderUser, notifyAdmins } from '../../notification/notify/order.js';
import { orderText } from '../../notification/notify/order-texts.js';

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

export function __resetPayStatusCache() {
	payStatusCache.clear();
}

export interface IOrderLifecycleService {
	createPaymentLink(orderId: number, userId: number): Promise<{ qrCode?: string; checkoutUrl?: string }>;
	verifyPayment(orderId: number, userId: number): Promise<string>;
	cancelOrder(orderId: number, userId: number): Promise<{ status: string; refunded: boolean; amount: number }>;
	adminUpdateOrder(id: number, patch: any): Promise<void>;
	processOrderEvent(id: number, type: string, payload: any): Promise<void>;
}

@injectable()
export class OrderLifecycleService implements IOrderLifecycleService {
	constructor(
		@inject('OrderRepository') private orderRepo: OrderRepository,
		@inject('IPaymentService') private paymentService: PaymentService,
		@inject('IPaymentWebhookService') private webhookService: PaymentWebhookService,
		@inject('IOrderFinanceService') private finance: IOrderFinanceService,
		@inject('IStockService') private stockService: IStockService,
		@inject('NotificationSubject') private subject: NotificationSubject,
	) {}

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

	async verifyPayment(orderId: number, userId: number): Promise<string> {
		const order = await this.orderRepo.findOrderWithTransactions(orderId, userId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.status !== OrderStatus.PENDING_PAYMENT) return order.status;

		const gateway = (order.transactions[0]?.gateway ?? PaymentGateway.PAYOS) as PaymentGateway;
		const remote = await getCachedPaymentStatus((g, c) => this.paymentService.getPaymentStatus(g, c), gateway, Number(order.orderCode));
		console.log(`[verifyPayment] orderId=${orderId} orderCode=${order.orderCode} remote=${remote}`);
		if (remote?.toUpperCase() === 'PAID') {
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

	async adminUpdateOrder(id: number, patch: any): Promise<void> {
		const data: any = {};

		if (patch.status != null) {
			if (!Object.values(OrderStatus).includes(patch.status)) {
				throw new AppError(ErrorCode.INTERNAL, 400);
			}
			const current = await this.orderRepo.findOrderStatus(id);
			if (!current) throw new AppError(ErrorCode.NOT_FOUND, 404);
			this.assertTransition(current.status, patch.status);
			data.status = patch.status;
		}

		if (patch.supplierId !== undefined) {
			if (!Number.isInteger(patch.supplierId)) throw new AppError(ErrorCode.INTERNAL, 400);
			data.supplierId = patch.supplierId;
		}
		if (patch.trackingCode !== undefined) data.trackingCode = patch.trackingCode;
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

	private static ALLOWED: Record<string, string[]> = {
		pending_payment: [],
		paid: [],
		partially_paid: [],
		processing: ['shipping'],
		shipping: ['delivered'],
		delivered: [],
		cancelled: [],
		pending_refund: ['refunded'],
		refunded: [],
	};

	private assertTransition(from: string, to: string): void {
		if (!OrderLifecycleService.ALLOWED[from]?.includes(to)) {
			throw new AppError(ErrorCode.INTERNAL, 400);
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
			case 'force_status':
				return this.forceStatus(order, payload ?? {});
			default:
				throw new AppError(ErrorCode.INTERNAL, 400);
		}
	}

	private async assignOrder(order: any, payload: any): Promise<void> {
		if (order.supplierId != null || (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PARTIALLY_PAID)) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const patch = payload.items as Array<{ itemIndex: number; supplierId: number; costPrice: number }>;
		if (!Array.isArray(patch) || patch.length === 0) throw new AppError(ErrorCode.INTERNAL, 400);

		for (const p of patch) {
			const item = items[p.itemIndex];
			if (!item) throw new AppError(ErrorCode.NOT_FOUND, 404);
			items[p.itemIndex] = { ...item, supplierId: p.supplierId, costPrice: p.costPrice };
		}
		const supplierIds = Array.from(new Set(items.map((i: any) => i.supplierId).filter(Boolean)));
		const orderSupplier = supplierIds.length === 1 ? supplierIds[0] : null;
		await this.orderRepo.updateOrder(order.id, { orderItems: items, supplierId: orderSupplier, status: OrderStatus.PROCESSING });
		const tProcessing = orderText('processing', { code: order.orderCode });
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.ORDER,
			channels: [NotificationChannel.DB],
			title: tProcessing.title,
			message: tProcessing.message,
			i18n: tProcessing.i18n,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}

	private async shipOrder(order: any): Promise<void> {
		this.assertTransition(order.status, OrderStatus.SHIPPING);
		await this.orderRepo.updateOrder(order.id, { status: OrderStatus.SHIPPING });
		const tShipping = orderText('shipping', { code: order.orderCode });
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.SHIPPING,
			channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
			title: tShipping.title,
			message: tShipping.message,
			i18n: tShipping.i18n,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}

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
		if (!touched) return;
		const allDelivered = items.length > 0 && items.every((it) => it.deliveredAt);
		await this.orderRepo.client.$transaction(async (tx) => {
			await this.orderRepo.updateOrder(
				order.id,
				{ orderItems: items, status: allDelivered ? OrderStatus.DELIVERED : OrderStatus.SHIPPING },
				tx,
			);
			if (allDelivered) await this.finance.recognizeIncome(order.id, order.totalAmount, tx);
		});
		if (allDelivered) {
			const tDelivered = orderText('delivered', { code: order.orderCode });
			await notifyOrderUser(this.subject, this.orderRepo.client, {
				userId: order.userId,
				type: NotificationType.ORDER,
				channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
				title: tDelivered.title,
				message: tDelivered.message,
				i18n: tDelivered.i18n,
				orderId: order.id,
				orderCode: order.orderCode,
			});
		}
	}

	private async reconcileCod(order: any): Promise<void> {
		if (order.status !== OrderStatus.DELIVERED) throw new AppError(ErrorCode.INTERNAL, 400);
		if (order.paymentType !== PaymentPlan.HALF) return;
		if (order.codReconciledAt) return;
		const codAmount = order.totalAmount - order.paidAmount;
		if (codAmount <= 0) return;
		await this.orderRepo.client.$transaction(async (tx) => {
			await this.orderRepo.createCashflow({ type: 'IN', orderId: order.id, amount: codAmount, date: new Date(), note: 'Thu COD' }, tx);
			await this.orderRepo.updateOrder(order.id, { codReconciledAt: new Date() }, tx);
		});
	}

	private async reconcileSupplier(order: any, payload: any): Promise<void> {
		if (![OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.DELIVERED].includes(order.status)) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		const idxSet = Array.isArray(payload.itemIndices)
			? new Set(payload.itemIndices as number[])
			: null;
		const candidates = items
			.map((it, i) => ({ it, i }))
			.filter(({ it, i }) => (idxSet ? idxSet.has(i) : true) && it.supplierId != null && !it.reconciledAt && it.returnFault !== 'supplier');

		const missingCost = candidates.filter(
			({ it }) => it.costPrice == null || Number.isNaN(Number(it.costPrice)) || Number(it.costPrice) <= 0,
		);
		if (missingCost.length > 0) throw new AppError('MISSING_SUPPLIER_COST', 400);

		const bySupplier = new Map<number, { amount: number; indices: number[] }>();
		for (const { it, i } of candidates) {
			const cur = bySupplier.get(it.supplierId) ?? { amount: 0, indices: [] };
			cur.amount += Number(it.costPrice);
			cur.indices.push(i);
			bySupplier.set(it.supplierId, cur);
		}
		if (bySupplier.size === 0) return;

		await this.orderRepo.client.$transaction(async (tx) => {
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
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		await this.orderRepo.updateOrder(order.id, { status: OrderStatus.PENDING_REFUND });
		const tPendingRefund = orderText('pendingRefund', { code: order.orderCode });
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.ORDER,
			channels: [NotificationChannel.DB],
			title: tPendingRefund.title,
			message: tPendingRefund.message,
			i18n: tPendingRefund.i18n,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}

	async cancelOrder(orderId: number, userId: number): Promise<{ status: string; refunded: boolean; amount: number }> {
		const order = await this.orderRepo.findOrderWithTransactions(orderId, userId, );
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (!['pending_payment', 'paid', 'partially_paid', 'processing', 'shipping'].includes(order.status)) {
			throw new AppError('Order cannot be cancelled', 400);
		}
		const beforeProcess = order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.PAID || order.status === OrderStatus.PARTIALLY_PAID;
		if (beforeProcess && order.paidAmount > 0) {
			await this.orderRepo.updateOrder(order.id, { status: OrderStatus.PENDING_REFUND });
			const tCancelRefundUser = orderText('cancelRefundUser', { code: order.orderCode, amount: order.paidAmount });
			const tCancelRefundAdmin = orderText('cancelRefundAdmin', { code: order.orderCode, amount: order.paidAmount });
			await notifyOrderUser(this.subject, this.orderRepo.client, {
				userId: order.userId,
				type: NotificationType.ORDER,
				channels: [NotificationChannel.DB],
				title: tCancelRefundUser.title,
				message: tCancelRefundUser.message,
				i18n: tCancelRefundUser.i18n,
				orderId: order.id,
				orderCode: order.orderCode,
			});
			await notifyAdmins(this.subject, this.orderRepo.client, {
				type: NotificationType.ORDER,
				title: tCancelRefundAdmin.title,
				message: tCancelRefundAdmin.message,
				i18n: tCancelRefundAdmin.i18n,
				orderId: order.id,
				orderCode: order.orderCode,
			});
			return { status: OrderStatus.PENDING_REFUND, refunded: false, amount: order.paidAmount };
		}
		if (order.status === OrderStatus.PENDING_PAYMENT) {
			await this.orderRepo.client.$transaction(async (tx) => {
				const { count } = await this.orderRepo.markCancelled(order.id, tx);
				if (count === 0) return;
				await this.stockService.restockOrderAlbums(order.orderItems, tx);
			});
			const tCancelledUser = orderText('cancelledUser', { code: order.orderCode });
			const tCancelUnpaidAdmin = orderText('cancelUnpaidAdmin', { code: order.orderCode });
			await notifyOrderUser(this.subject, this.orderRepo.client, {
				userId: order.userId,
				type: NotificationType.ORDER,
				channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
				title: tCancelledUser.title,
				message: tCancelledUser.message,
				i18n: tCancelledUser.i18n,
				orderId: order.id,
				orderCode: order.orderCode,
			});
			await notifyAdmins(this.subject, this.orderRepo.client, {
				type: NotificationType.ORDER,
				title: tCancelUnpaidAdmin.title,
				message: tCancelUnpaidAdmin.message,
				i18n: tCancelUnpaidAdmin.i18n,
				orderId: order.id,
				orderCode: order.orderCode,
			});
			return { status: OrderStatus.CANCELLED, refunded: false, amount: 0 };
		}
		await this.orderRepo.updateOrder(order.id, { status: OrderStatus.CANCELLED });
		const tCancelledUser2 = orderText('cancelledUser', { code: order.orderCode });
		const tCancelProcessingAdmin = orderText('cancelProcessingAdmin', { code: order.orderCode });
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.ORDER,
			channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
			title: tCancelledUser2.title,
			message: tCancelledUser2.message,
			i18n: tCancelledUser2.i18n,
			orderId: order.id,
			orderCode: order.orderCode,
		});
		await notifyAdmins(this.subject, this.orderRepo.client, {
			type: NotificationType.ORDER,
			title: tCancelProcessingAdmin.title,
			message: tCancelProcessingAdmin.message,
			i18n: tCancelProcessingAdmin.i18n,
			orderId: order.id,
			orderCode: order.orderCode,
		});
		return { status: OrderStatus.CANCELLED, refunded: false, amount: 0 };
	}

	private async reconcileRefund(order: any): Promise<void> {
		if (order.status !== OrderStatus.PENDING_REFUND) throw new AppError(ErrorCode.INTERNAL, 400);
		const amount = order.paidAmount;
		try {
			await this.paymentService.refund(PaymentGateway.PAYOS, Number(order.orderCode));
		} catch {
		}
		await this.orderRepo.client.$transaction(async (tx) => {
			await this.orderRepo.markTransactionsRefunded(order.id, tx);
			await this.orderRepo.createCashflow({ type: 'OUT', orderId: order.id, amount, date: new Date(), note: `Hoàn tiền khách (đơn ${order.orderCode})` }, tx);
			await this.orderRepo.updateOrder(order.id, { status: OrderStatus.REFUNDED }, tx);
		});
		const tRefunded = orderText('refunded', { code: order.orderCode, amount });
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.PAYMENT,
			channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
			title: tRefunded.title,
			message: tRefunded.message,
			i18n: tRefunded.i18n,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}

	private async forceStatus(order: any, payload: any): Promise<void> {
		const { status, reason } = payload as { status?: string; reason?: string };
		if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		if (!reason || String(reason).trim().length < 5) {
			throw new AppError('force_status requires a reason (min 5 chars)', 400);
		}
		const auditNote = `[FORCE ${new Date().toISOString()}] ${status.toUpperCase()}: ${String(reason).trim()}`;
		const note = order.note ? `${order.note}\n${auditNote}` : auditNote;
		await this.orderRepo.updateOrder(order.id, { status, note });
		const tForce = orderText('forceStatus', { code: order.orderCode, status });
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.ORDER,
			channels: [NotificationChannel.DB],
			title: tForce.title,
			message: tForce.message,
			i18n: tForce.i18n,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}
}
