import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { IOrderService } from './order.service.js';
import { ApiResponse } from '../../middleware/api.response.js';

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

	cancelOrder = async (req: AuthRequest, res: Response) => {
		const result = await this.orderService.cancelOrder(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.success(result));
	};

	listAllOrders = async (req: AuthRequest, res: Response) => {
		const orders = await this.orderService.listAllOrders();
		res.json(ApiResponse.success(orders));
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
}
