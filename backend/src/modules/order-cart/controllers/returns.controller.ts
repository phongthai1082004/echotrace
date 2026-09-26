import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {IReturnsService} from '../returns/returns.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode, ReturnFault } from '@echotrace/shared';

@injectable()
export class ReturnsController {
	constructor(@inject('IReturnsService') private readonly returnsService: IReturnsService) {}

	requestReturn = async (req: AuthRequest, res: Response) => {
		const { reason, items } = req.body ?? {};
		await this.returnsService.requestReturn(parseInt(req.params.id as string), parseInt(req.userId!), { reason, items });
		res.json(ApiResponse.message('Return requested'));
	};

	approveReturn = async (req: AuthRequest, res: Response) => {
		const { fault } = req.body ?? {};
		if (fault !== ReturnFault.SELF && fault !== ReturnFault.SUPPLIER) throw new AppError(ErrorCode.INTERNAL, 400);
		await this.returnsService.approveReturn(parseInt(req.params.id as string), { fault });
		res.json(ApiResponse.message('Return approved'));
	};

	markReshipped = async (req: AuthRequest, res: Response) => {
		await this.returnsService.markReshipped(parseInt(req.params.id as string));
		res.json(ApiResponse.message('Marked reshipped'));
	};

	reportDefect = async (req: AuthRequest, res: Response) => {
		await this.returnsService.reportDefect(parseInt(req.params.id as string), parseInt(req.userId!));
		res.json(ApiResponse.message('Defect reported'));
	};

	markDefective = async (req: AuthRequest, res: Response) => {
		await this.returnsService.markDefective(parseInt(req.params.id as string));
		res.json(ApiResponse.message('Marked defective'));
	};
}
