import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { IOrderService } from './order.service.js';
import { ApiResponse } from '../../middleware/api.response.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode, ReturnFault } from '@echotrace/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@injectable()
export class OrderController {
	constructor(@inject('IOrderService') private readonly orderService: IOrderService) {}

	createOrder = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		// Idempotency-Key do FE sinh mỗi lần bấm Đặt hàng — chống double-submit.
		const idempotencyKey = req.header('Idempotency-Key');
		if (!idempotencyKey || !UUID_RE.test(idempotencyKey)) {
			res.status(400).json(ApiResponse.error('Idempotency-Key (UUID) is required', 400));
			return;
		}
		const result = await this.orderService.createOrder(idempotencyKey, JSON.stringify(req.body ?? {}), userId);
		res.json(ApiResponse.success(result));
	};

	listMyOrders = async (req: AuthRequest, res: Response) => {
		const orders = await this.orderService.listMyOrders(parseInt(req.userId!));
		res.json(ApiResponse.success(orders));
	};

	createPaymentLink = async (req: AuthRequest, res: Response) => {
		const result = await this.orderService.createPaymentLink(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.success(result));
	};

	verifyPayment = async (req: AuthRequest, res: Response) => {
		const status = await this.orderService.verifyPayment(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.success({ status }));
	};

	getWebhookConfig = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success({ 
			webhookUrl: process.env.WEBHOOK_URL || 'Not configured'
		}));
	};

	cancelOrder = async (req: AuthRequest, res: Response) => {
		const result = await this.orderService.cancelOrder(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.success(result));
	};

	listAllOrders = async (req: AuthRequest, res: Response) => {
		const orders = await this.orderService.listAllOrders();
		res.json(ApiResponse.success(orders));
	};

	getOrderById = async (req: AuthRequest, res: Response) => {
		const order = await this.orderService.getOrderById(parseInt(req.params.id as string));
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		res.json(ApiResponse.success(order));
	};

	processEvent = async (req: AuthRequest, res: Response) => {
		const { type, ...payload } = req.body ?? {};
		await this.orderService.processOrderEvent(parseInt(req.params.id as string), type, payload);
		res.json(ApiResponse.message('Order event processed'));
	};

	updateOrder = async (req: AuthRequest, res: Response) => {
		await this.orderService.adminUpdateOrder(parseInt(req.params.id as string), req.body ?? {});
		res.json(ApiResponse.message('Order updated'));
	};

	requestReturn = async (req: AuthRequest, res: Response) => {
		const { reason, items } = req.body ?? {};
		// ponytail: items tuỳ chọn; nếu thiếu coi như cả đơn lỗi.
		if (items !== undefined && (!Array.isArray(items) || items.some((r: any) => typeof r?.index !== 'number' || typeof r?.quantity !== 'number' || r.quantity <= 0))) {
			throw new AppError(ErrorCode.INTERNAL, 400);
		}
		await this.orderService.requestReturn(parseInt(req.params.id as string), parseInt(req.userId!), { reason, items });
		res.json(ApiResponse.message('Return requested'));
	};

	approveReturn = async (req: AuthRequest, res: Response) => {
		const { fault } = req.body ?? {};
		if (fault !== ReturnFault.SELF && fault !== ReturnFault.SUPPLIER) throw new AppError(ErrorCode.INTERNAL, 400);
		await this.orderService.approveReturn(parseInt(req.params.id as string), { fault });
		res.json(ApiResponse.message('Return approved'));
	};

	markReshipped = async (req: AuthRequest, res: Response) => {
		await this.orderService.markReshipped(parseInt(req.params.id as string));
		res.json(ApiResponse.message('Marked reshipped'));
	};

	reportDefect = async (req: AuthRequest, res: Response) => {
		await this.orderService.reportDefect(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.message('Defect reported'));
	};

	markDefective = async (req: AuthRequest, res: Response) => {
		await this.orderService.markDefective(parseInt(req.params.id as string));
		res.json(ApiResponse.message('Marked defective'));
	};
}
