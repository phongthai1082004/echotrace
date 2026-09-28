import { inject, injectable } from 'tsyringe';
import { Prisma } from '../../../../generated/prisma/client.js';
import { OrderRepository } from '../repositories/order.repository.js';
import {
	IdempotencyKeyType,
	PaymentPlan,
	TransactionType,
	TransactionStatus,
	OrderStatus,
	toOrderItem,
	parseCreateOrderDTO,
	CreatePaymentLinkDto,
	ErrorCode,
	PAYMENT_LINK_EXPIRY_MS,
} from '@echotrace/shared';
import { AppError } from '../../../shared/middleware/app.error.js';
import type {ICartService} from '../cart/cart.service.js';
import type {IBookService} from '../../product/books/books.service.js';
import { NotificationSubject } from '../../notification/notification.subject.js';
import { notifyAdmins } from '../../notification/notify/order.js';
import { orderText } from '../../notification/notify/order-texts.js';
import { NotificationType, NotificationChannel } from '@echotrace/shared';
import { PaymentService } from '../../financial/payments/gateways/payment.service.js';import { scheduleDelayedJob } from '../queue/redis-delayed-queue.js';
import { PaymentLinkItem } from '@payos/node';
import type {IPdfQueue} from '../../pdf/render/pdf.types.js';
import type {IStockService} from '../../product/sample-books/stock.service.js';
import type {ISampleBookService} from '../../product/sample-books/sample-books.service.js';
import type {ICouponService} from '../coupons/coupons.service.js';

export interface ICheckoutService {
	createOrder(idempotencyKey: string, requestBody: string, userId: number): Promise<any>;
	createAlbumOrder(input: {
		customerId: number;
		sampleBookId: number;
		quantity?: number;
		cover?: string | null;
		paper?: string | null;
		name?: string;
		phone?: string;
		address?: string;
		city?: string;
		note?: string;
		paymentMethod: PaymentPlan;
		couponCode?: string | null;
		utmSource?: unknown;
		utmMedium?: unknown;
		utmCampaign?: unknown;
	}): Promise<any>;
}

@injectable()
export class CheckoutService implements ICheckoutService {
	constructor(
		@inject('ICartService') private cartService: ICartService,
		@inject('IBookService') private bookService: IBookService,
		@inject('IPaymentService') private paymentService: PaymentService,
		@inject('IPdfQueue') private pdfQueue: IPdfQueue,
		@inject('OrderRepository') private orderRepo: OrderRepository,
		@inject('IStockService') private stockService: IStockService,
		@inject('ISampleBookService') private sampleBookService: ISampleBookService,
		@inject('ICouponService') private couponService: ICouponService,
		@inject('NotificationSubject') private subject: NotificationSubject,
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
			// ép flush delta treo trước khi snapshot đơn (đơn không đọc đồ cũ).
			await this.bookService.flushBooks(bookIds);
			const quote = await this.cartService.calculateCart(
				userId,
				createOrderDto.paymentMethod,
				createOrderDto.couponCode,
				bookIds,
			);
			{
				const need0 = await this.stockService.sumNeedBySampleBook(bookIds, quote.items, this.orderRepo.client);
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
					const needBySample = await this.stockService.sumNeedBySampleBook(bookIds, quote.items, tx);
					if (needBySample.size) {
						const samples = await this.orderRepo.findSampleBooks([...needBySample.keys()], tx);
						for (const s of samples) {
							const need = needBySample.get(s.id) ?? 0;
							if (s.quantity == null) continue; // unlimited
							const r = await this.orderRepo.updateSampleBookQuantity(s.id, need, tx);
							if (r.count === 0) throw new AppError('Vượt quá số lượng tồn kho', 400);
						}
					}

				const itemsSnapshot = quote.items.map((item) => toOrderItem(item));
				// đơn nhiều sách khác camp thì lấy book đầu tiên có UTM
				const pinned = await this.orderRepo.findBooksAttribution(bookIds, tx);
				const byId = new Map(pinned.map((b) => [b.id, b]));
				const first = bookIds.map((id) => byId.get(id)).find((b) => b?.utmSource);
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
						utmSource: first?.utmSource ?? null,
						utmMedium: first?.utmMedium ?? null,
						utmCampaign: first?.utmCampaign ?? null,
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

					if (quote.coupon && quote.coupon.id) {
						await this.couponService.validateAndIncrementCoupon(quote.coupon.id, tx);
					}

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

			scheduleDelayedJob('order_expiry', { orderId: result.orderId }, PAYMENT_LINK_EXPIRY_MS);

			this.pdfQueue.enqueue(result.orderId).catch(() => {});

			if (!idempotencyKey.startsWith('admin-album-')) {
				const tNew = orderText('newOrderAdmin', { code: result.orderCode, total: result.total });
				await notifyAdmins(this.subject, this.orderRepo.client, {
					type: NotificationType.ORDER,
					title: tNew.title,
					message: tNew.message,
					i18n: tNew.i18n,
					orderId: result.orderId,
					orderCode: result.orderCode,
				});
			}

			return result;
		} catch (error) {
			await this.orderRepo.markIdempotencyFailed(idempotencyKey).catch(() => {});
			throw error;
		}
	}

	async createAlbumOrder(input: {
		customerId: number;
		sampleBookId: number;
		quantity?: number;
		cover?: string | null;
		paper?: string | null;
		name?: string;
		phone?: string;
		address?: string;
		city?: string;
		note?: string;
		paymentMethod: PaymentPlan;
		couponCode?: string | null;
		utmSource?: unknown;
		utmMedium?: unknown;
		utmCampaign?: unknown;
	}): Promise<any> {
		const customerId = Number(input.customerId);
		const sampleBookId = Number(input.sampleBookId);
		const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
		if (!Number.isFinite(customerId) || !Number.isFinite(sampleBookId)) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		if (!Object.values(PaymentPlan).includes(input.paymentMethod)) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		const album = await this.sampleBookService.getPublishedById(sampleBookId);
		if ((album as any).type && (album as any).type !== 'ALBUM') {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		const item = await this.cartService.addAlbumToCart(customerId, { sampleBookId, quantity, cover: input.cover ?? null, paper: input.paper ?? null });
		const body = JSON.stringify({
			items: [
				{
					bookId: item.bookId,
					quantity: item.quantity || quantity,
					cover: (item as any).cover ?? null,
					paper: (item as any).paper ?? null,
					paperSize: (item as any).paperSize ?? null,
				},
			],
			name: input.name,
			phone: input.phone,
			address: input.address,
			city: input.city,
			note: input.note,
			paymentMethod: input.paymentMethod,
			couponCode: input.couponCode ?? null,
		});
		return this.createOrder(`admin-album-${customerId}-${sampleBookId}-${Date.now()}`, body, customerId).then(async (result) => {
			// Không chọn thì giữ nguyên (sách online → đúng kênh, thuần offline → unknown).
			const source = String(input.utmSource ?? '').trim().toLowerCase().slice(0, 64);
			if (source) {
				await this.orderRepo.updateOrder(result.orderId, {
					utmSource: source,
					utmMedium: String(input.utmMedium ?? '').trim().toLowerCase().slice(0, 64) || null,
					utmCampaign: String(input.utmCampaign ?? '').trim().slice(0, 128) || null,
				}).catch((e) => console.warn('[album-order] utm update failed:', (e as Error)?.message || e));
			}
			return result;
		});
	}

	private createOrderCode(): number {
		return Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
	}
}
