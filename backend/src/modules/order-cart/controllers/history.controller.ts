import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {IOrderHistoryService} from '../history/order-history.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class HistoryController {
	constructor(@inject('IOrderHistoryService') private readonly historyService: IOrderHistoryService) {}

	listMyOrders = async (req: AuthRequest, res: Response) => {
		const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
		const take = req.query.limit ? Number(req.query.limit) : undefined;
		res.json(
			ApiResponse.success(
				await this.historyService.listMyOrders(parseInt(req.userId!), {
					cursor: Number.isFinite(cursor) ? cursor : undefined,
					take,
				}),
			),
		);
	};

	listAllOrders = async (req: AuthRequest, res: Response) => {
		const orders = await this.historyService.listAllOrders();
		res.json(ApiResponse.success(orders));
	};

	getOrderById = async (req: AuthRequest, res: Response) => {
		const order = await this.historyService.getOrderById(parseInt(req.params.id as string));
		if (!order) throw new AppError(ErrorCode.NOT_FOUND, 404);
		res.json(ApiResponse.success(order));
	};

	queuePdf = async (req: AuthRequest, res: Response) => {
		await this.historyService.queueOrderPdf(Number(req.params.id), parseInt(req.userId!));
		res.json(ApiResponse.success({ queued: true }));
	};

	queuePdfAdmin = async (req: AuthRequest, res: Response) => {
		await this.historyService.queueOrderPdf(Number(req.params.id));
		res.json(ApiResponse.success({ queued: true }));
	};

	marketingSummary = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.historyService.getMarketingSummary(Number(req.query.days))));
	};
}
