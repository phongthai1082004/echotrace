import { inject, injectable } from 'tsyringe';
import { OrderRepository } from '../repositories/order.repository.js';
import { OrderStatus, ReturnState, ReturnFault, DefectState, ErrorCode, NotificationChannel, NotificationType } from '@echotrace/shared';
import { AppError } from '../../../shared/middleware/app.error.js';
import { IOrderFinanceService } from '../../financial/settlement/order-finance.bridge.js';
import { NotificationSubject } from '../../notification/notification.subject.js';
import { notifyOrderUser, notifyAdmins } from '../../notification/notify/order.js';

export interface IReturnsService {
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
export class ReturnsService implements IReturnsService {
	constructor(
		@inject('OrderRepository') private orderRepo: OrderRepository,
		@inject('IOrderFinanceService') private finance: IOrderFinanceService,
		@inject('NotificationSubject') private subject: NotificationSubject,
	) {}

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
		for (const r of reported) {
			if (r.index < 0 || r.index >= items.length || !Number.isInteger(r.quantity) || r.quantity <= 0) {
				throw new AppError(ErrorCode.INTERNAL, 400);
			}
			items[r.index] = { ...items[r.index], defective: true, returnQty: r.quantity, returnDefect: r.defect ?? null };
		}
		await this.orderRepo.updateOrder(orderId, { returnState: ReturnState.REQUESTED, returnReason: body.reason ?? null, orderItems: items });
		await notifyAdmins(this.subject, this.orderRepo.client, {
			type: NotificationType.ORDER,
			title: `Yêu cầu đổi trả đơn ${order.orderCode}`,
			message: `<p>Khách vừa gửi yêu cầu đổi trả đơn <b>${order.orderCode}</b>${body.reason ? `: ${body.reason}` : ''}.</p>`,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}

	async approveReturn(orderId: number, body: { fault: ReturnFault }): Promise<void> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.returnState !== ReturnState.REQUESTED) throw new AppError(ErrorCode.INTERNAL, 400);

		const fault = body.fault === ReturnFault.SUPPLIER ? ReturnFault.SUPPLIER : ReturnFault.SELF;
		const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
		for (const it of items) {
			if (it.defective && fault === ReturnFault.SUPPLIER) it.returnFault = 'supplier';
		}
		await this.orderRepo.updateOrder(orderId, { returnFault: fault, orderItems: items, returnState: ReturnState.RESHIPPING });
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.ORDER,
			channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
			title: `Yêu cầu đổi trả đơn ${order.orderCode} được duyệt`,
			message: `<p>Yêu cầu đổi trả đơn <b>${order.orderCode}</b> đã được duyệt. Chúng tôi sẽ liên hệ để nhận lại hàng.</p>`,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}

	async markReshipped(orderId: number): Promise<void> {
		const order = await this.orderRepo.findOrderById(orderId);
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		if (order.returnState !== ReturnState.RESHIPPING) throw new AppError(ErrorCode.INTERNAL, 400);
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
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.SHIPPING,
			channels: [NotificationChannel.DB, NotificationChannel.EMAIL],
			title: `Đơn ${order.orderCode} đã được gửi lại`,
			message: `<p>Hàng bảo hành/đổi trả của đơn <b>${order.orderCode}</b> đã được gửi lại.</p>`,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}

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
		await notifyOrderUser(this.subject, this.orderRepo.client, {
			userId: order.userId,
			type: NotificationType.ORDER,
			channels: [NotificationChannel.DB],
			title: `Đã ghi nhận lỗi đơn ${order.orderCode}`,
			message: `<p>Báo lỗi của đơn <b>${order.orderCode}</b> đã được ghi nhận và đang xử lý.</p>`,
			orderId: order.id,
			orderCode: order.orderCode,
		});
	}
}
