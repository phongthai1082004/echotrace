import { injectable, inject } from 'tsyringe';
import { Prisma } from '../../../../generated/prisma/client.js';
import {
	ErrorCode,
	OrderStatus,
	TransactionStatus,
	WebhookProcessResult,
} from '@echotrace/shared';
import { AppError } from '../../../shared/middleware/app.error.js';
import { NotificationChannel, NotificationType } from '@echotrace/shared';
import { NotificationSubject } from '../../notification/notification.subject.js';
import { PaymentWebhookRepository } from './payment.repository.js';
import { IStockService } from '../../product/sample-books/stock.service.js';

export interface IPaymentWebhookService {
	processWebhook(result: WebhookProcessResult): Promise<void>;
}

@injectable()
export class PaymentWebhookService implements IPaymentWebhookService {
	constructor(
		@inject('NotificationSubject') private subject: NotificationSubject,
		@inject('PaymentWebhookRepository') private paymentRepo: PaymentWebhookRepository,
		@inject('IStockService') private stockService: IStockService,
	) {}

	async processWebhook(result: WebhookProcessResult): Promise<void> {
		let email: {
			to: string;
			name: string;
			userId: number;
			orderId: number;
			orderCode: string;
			paid: number;
			total: number;
			fullyPaid: boolean;
		} | null = null;

		await this.paymentRepo.client.$transaction(
			async (tx) => {
				const txn = await tx.transaction.findUnique({
					where: { gatewayTransactionCode: result.gatewayTransactionCode },
				});
				if (!txn) throw new AppError(ErrorCode.NOT_FOUND, 404);
				if (txn.status === TransactionStatus.SUCCESS) return; // PayOS retry → bỏ qua

				await tx.transaction.update({
					where: { id: txn.id },
					data: {
						status: result.status,
						reference: result.reference ?? txn.reference,
						rawPayload: result.rawPayload as any,
					},
				});

				if (!txn.orderId) return;
				const order = await tx.order.findUnique({
					where: { id: txn.orderId },
					select: {
						id: true,
						status: true,
						paidAmount: true,
						totalAmount: true,
						orderCode: true,
						userId: true,
						user: { select: { email: true, name: true } },
					},
				});

				// ponytail: không hồi sinh đơn đã huỷ/hoàn khi nhận webhook muộn (link hết hạn mà PayOS vẫn báo)
				if (order && (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED)) return;

				if (result.status === TransactionStatus.SUCCESS && order) {
					// ponytail: chặn đúp paidAmount/Income khi có ≥2 mã giao dịch SUCCESS khác nhau
					// (renew link, webhook retransmit mã khác). txn hiện tại chưa SUCCESS (đã qua guard dòng 28)
					// nên count chỉ đếm mã khác → >0 nghĩa là trùng, bỏ qua. Serializable → race-safe.
					const dupPaid = await tx.transaction.count({ where: { orderId: order.id, status: TransactionStatus.SUCCESS, id: { not: txn.id } } });
					if (dupPaid > 0) return;
					const paidAmount = order.paidAmount + result.amount;
					// Đủ tiền (FULL) → PAID; thiếu (cọc) → PARTIALLY_PAID, gán NCC mới thành PROCESSING
					const isFull = paidAmount >= order.totalAmount;
					const status = isFull ? OrderStatus.PAID : OrderStatus.PARTIALLY_PAID;
					await tx.order.update({ where: { id: order.id }, data: { paidAmount, status } });

					// Cashflow: ghi dòng tiền lúc nhận (tách biệt với Income)
					const existingCf = await tx.cashflow.findFirst({ where: { transactionId: txn.id } });
					if (!existingCf) {
						await tx.cashflow.create({
							data: {
								type: 'IN',
								transactionId: txn.id,
								orderId: order.id,
								amount: result.amount,
								date: new Date(),
								note: isFull ? 'Thanh toán đủ' : 'Tiền cọc (50%)',
							},
						});
					}
					// ponytail: Income ghi nhận tại DELIVERED (order.service.deliverOrder); trigger cộng counters.
					// Ở đây chỉ ghi Cashflow IN (tiền thực thu), tách biệt với doanh thu.

					if (order.user?.email) {
						email = {
							to: order.user.email,
							name: order.user.name || '',
							userId: order.userId,
							orderId: order.id,
							orderCode: order.orderCode || String(result.orderCode),
							paid: paidAmount,
							total: order.totalAmount,
							fullyPaid: isFull,
						};
					}
				} else if (result.status === TransactionStatus.CANCELLED && order) {
					// ponytail: flip status first using a conditional updateMany (WHERE status=PENDING_PAYMENT).
					// count=0 means another path (user cancel, expiry) already cancelled — skip restock
					// to prevent double-increment of stock.
					if (order.status === OrderStatus.PENDING_PAYMENT) {
						const { count } = await tx.order.updateMany({
							where: { id: order.id, status: OrderStatus.PENDING_PAYMENT },
							data: { status: OrderStatus.CANCELLED },
						});
						if (count > 0) {
							const oi = await tx.order.findUnique({ where: { id: order.id }, select: { orderItems: true } });
							await this.stockService.restockOrderAlbums(oi?.orderItems, tx);
						}
					} else {
						await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
					}
				}
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);

		// ponytail: one fan-out replaces the old direct mail — channels route it.
		if (email) {
			const title = email.fullyPaid
				? `Đã nhận thanh toán đơn ${email.orderCode}`
				: `Đã nhận tiền cọc đơn ${email.orderCode}`;
			const message = `<p>Xin chào ${email.name || 'bạn'},</p><p>Chúng tôi đã nhận <b>${email.paid.toLocaleString('vi-VN')}đ</b> cho đơn <b>${email.orderCode}</b>.</p>${
				email.fullyPaid
					? '<p>Đơn hàng đã được thanh toán đủ và đang được xử lý.</p>'
					: `<p>Đây là 50% tiền cọc. Phần còn lại <b>${(email.total - email.paid).toLocaleString('vi-VN')}đ</b> sẽ thu khi giao hàng (COD).</p>`
			}`;
			await this.subject.notify({
				userId: String(email.userId),
				email: email.to,
				type: NotificationType.PAYMENT,
				channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
				title,
				message,
				metadata: { orderId: email.orderId, orderCode: email.orderCode },
			});
		}
	}
}
