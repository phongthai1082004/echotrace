import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { IOrderLifecycleService } from '../lifecycle/order-lifecycle.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';

@injectable()
export class LifecycleController {
	constructor(@inject('IOrderLifecycleService') private readonly lifecycleService: IOrderLifecycleService) {}

	createPaymentLink = async (req: AuthRequest, res: Response) => {
		const result = await this.lifecycleService.createPaymentLink(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.success(result));
	};

	verifyPayment = async (req: AuthRequest, res: Response) => {
		const status = await this.lifecycleService.verifyPayment(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.success({ status }));
	};

	getWebhookConfig = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success({
			webhookUrl: process.env.WEBHOOK_URL || 'Not configured'
		}));
	};

	cancelOrder = async (req: AuthRequest, res: Response) => {
		const result = await this.lifecycleService.cancelOrder(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.success(result));
	};

	processEvent = async (req: AuthRequest, res: Response) => {
		const { type, ...payload } = req.body ?? {};
		await this.lifecycleService.processOrderEvent(parseInt(req.params.id as string), type, payload);
		res.json(ApiResponse.message('Order event processed'));
	};

	updateOrder = async (req: AuthRequest, res: Response) => {
		await this.lifecycleService.adminUpdateOrder(parseInt(req.params.id as string), req.body ?? {});
		res.json(ApiResponse.message('Order updated'));
	};
}
