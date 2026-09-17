import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { CreatePrintOptionDTO } from '@echotrace/shared';
import { UpdatePrintOptionDTO } from '@echotrace/shared';
import type {IPrintOptionService} from './print-options.service.js';

@injectable()
export class PrintOptionController {
	constructor(@inject('IPrintOptionService') private readonly printOptionService: IPrintOptionService) {}

	list = async (req: AuthRequest, res: Response) => {
		const type = String(req.query.type ?? '');
		const search = String(req.query.search ?? '');
		const items = await this.printOptionService.list(type || undefined, search || undefined);
		res.json(ApiResponse.success({ items }));
	};

	create = async (req: AuthRequest, res: Response) => {
		const result = await this.printOptionService.create(req.body as CreatePrintOptionDTO);
		res.json(ApiResponse.success(result));
	};

	update = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const result = await this.printOptionService.update(id, req.body as UpdatePrintOptionDTO);
		res.json(ApiResponse.success(result));
	};

	remove = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		await this.printOptionService.remove(id);
		res.json(ApiResponse.success({ deleted: true }));
	};
}
