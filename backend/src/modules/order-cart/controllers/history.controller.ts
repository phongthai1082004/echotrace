import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { IOrderHistoryService } from '../history/order-history.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class HistoryController {
	constructor(@inject('IOrderHistoryService') private readonly historyService: IOrderHistoryService) {}

	listMyOrders = async (req: AuthRequest, res: Response) => {
		const orders = await this.historyService.listMyOrders(parseInt(req.userId!));
		res.json(ApiResponse.success(orders));
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
}
