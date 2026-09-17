import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {IFinanceService} from './finance.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';

@injectable()
export class FinanceController {
	constructor(@inject('IFinanceService') private readonly financeService: IFinanceService) {}

	getSummary = async (_req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.financeService.getSummary()));
	};

	getSuppliers = async (_req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.financeService.getSuppliers()));
	};

	createExpense = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.financeService.createExpense(req.body ?? {})));
	};

	private listQuery(q: any) {
		return {
			cursor: q.cursor ? Number(q.cursor) : undefined,
			limit: q.limit ? Number(q.limit) : undefined,
			from: q.from as string | undefined,
			to: q.to as string | undefined,
			category: q.category as string | undefined,
			type: q.type as string | undefined,
		};
	}

	listIncome = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.financeService.listIncome(this.listQuery(req.query))));
	};

	listExpense = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.financeService.listExpense(this.listQuery(req.query))));
	};

	listCashflow = async (req: AuthRequest, res: Response) => {
		res.json(ApiResponse.success(await this.financeService.listCashflow(this.listQuery(req.query))));
	};
}
