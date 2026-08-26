import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
	ErrorCode,
	OrderStatus,
	TransactionStatus,
	WebhookProcessResult,
} from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';

export abstract class IPaymentWebhookService {
	abstract processWebhook(result: WebhookProcessResult): Promise<void>;
}

@injectable()
export class PaymentWebhookService implements IPaymentWebhookService {
	async processWebhook(result: WebhookProcessResult): Promise<void> {
		let email: { to: string; name: string; orderCode: string; paid: number; total: number; fullyPaid: boolean } | null = null;

		await prisma.$transaction(
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
					// Income: FULL ghi nhận ngay; HALF ghi lúc giao hàng (reconcile_cod)
					if (isFull) {
						await tx.income.create({
							data: {
								transactionId: txn.id,
								orderId: order.id,
								amount: order.totalAmount,
								receivedAt: new Date(),
								note: 'Doanh thu toàn bộ (FULL)',
							},
						});
					}

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
		try {
			// ponytail: Resend REST trực tiếp, đổi sang service riêng khi cần template/attach
			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					from: process.env.MAIL_FROM || 'onboarding@resend.dev',
					to: [mail.to],
					subject: mail.fullyPaid
						? `Đã nhận thanh toán đơn ${mail.orderCode}`
						: `Đã nhận tiền cọc đơn ${mail.orderCode}`,
					html: `<p>Xin chào ${mail.name || 'bạn'},</p><p>Chúng tôi đã nhận <b>${mail.paid.toLocaleString('vi-VN')}đ</b> cho đơn <b>${mail.orderCode}</b>.</p>${
						mail.fullyPaid
							? '<p>Đơn hàng đã được thanh toán đủ và đang được xử lý.</p>'
							: `<p>Đây là 50% tiền cọc. Phần còn lại <b>${(mail.total - mail.paid).toLocaleString('vi-VN')}đ</b> sẽ thu khi giao hàng (COD).</p>`
					}`,
				}),
			});
			if (!res.ok) console.error('[payos-webhook] email failed:', await res.text());
		} catch (e: any) {
			console.error('[payos-webhook] email error:', e?.message || e);
		}
	}
}
