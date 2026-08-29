import { injectable, inject } from 'tsyringe';
import { Prisma } from '../../../generated/prisma/client.js';
import {
	ErrorCode,
	OrderStatus,
	TransactionStatus,
	WebhookProcessResult,
} from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { restockOrderAlbums } from '../sample-books/stock.service.js';
import { EmailService } from '../email/email.service.js';
import { PaymentWebhookRepository } from './payment.repository.js';

export interface IPaymentWebhookService {
	processWebhook(result: WebhookProcessResult): Promise<void>;
}

@injectable()
export class PaymentWebhookService implements IPaymentWebhookService {
	constructor(
		@inject('IEmailService') private emailService: EmailService,
		@inject('PaymentWebhookRepository') private paymentRepo: PaymentWebhookRepository,
	) {}

	async processWebhook(result: WebhookProcessResult): Promise<void> {
		let email: { to: string; name: string; orderCode: string; paid: number; total: number; fullyPaid: boolean } | null = null;

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
						user: { select: { email: true, name: true } },
					},
				});

				// ponytail: không hồi sinh đơn đã huỷ/hoàn khi nhận webhook muộn (link hết hạn mà PayOS vẫn báo)
				if (order && (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED)) return;

				if (result.status === TransactionStatus.SUCCESS && order) {
					// ponytail: chặn đúp paidAmount/Income khi có ≥2 mã giao dịch SUCCESS khác nhau
					// (renew link, webhook retransmit mã khác). txn hiện tại chưa SUCCESS (đã qua guard dòng 28)
					// nên count chỉ đếm mã khác → >0 nghĩa là trùng, bỏ qua. Serializable → race-safe.
					const dupPaid = await tx.transaction.count({ where: { orderId: order.id, status: TransactionStatus.SUCCESS } });
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
							orderCode: order.orderCode || String(result.orderCode),
							paid: paidAmount,
							total: order.totalAmount,
							fullyPaid: isFull,
						};
					}
				} else if (result.status === TransactionStatus.CANCELLED && order) {
					// ponytail: link bị huỷ khi còn PENDING_PAYMENT → hoàn tồn kho album (đồng bộ với cancel/user + expiry)
				if (order.status === OrderStatus.PENDING_PAYMENT) {
					const oi = await tx.order.findUnique({ where: { id: order.id }, select: { orderItems: true } });
					// ponytail: chạy trong tx Serializable để đồng bộ tồn kho + status order
					await restockOrderAlbums(oi?.orderItems, tx);
				}
					await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
				}
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);

		if (email) await this.sendConfirmation(email);
	}

	private async sendConfirmation(mail: {
		to: string;
		name: string;
		orderCode: string;
		paid: number;
		total: number;
		fullyPaid: boolean;
	}): Promise<void> {
		const subject = mail.fullyPaid
			? `Đã nhận thanh toán đơn ${mail.orderCode}`
			: `Đã nhận tiền cọc đơn ${mail.orderCode}`;
		const html = `<p>Xin chào ${mail.name || 'bạn'},</p><p>Chúng tôi đã nhận <b>${mail.paid.toLocaleString('vi-VN')}đ</b> cho đơn <b>${mail.orderCode}</b>.</p>${
			mail.fullyPaid
				? '<p>Đơn hàng đã được thanh toán đủ và đang được xử lý.</p>'
				: `<p>Đây là 50% tiền cọc. Phần còn lại <b>${(mail.total - mail.paid).toLocaleString('vi-VN')}đ</b> sẽ thu khi giao hàng (COD).</p>`
		}`;
		await this.emailService.send({ to: mail.to, subject, html });
	}
}
