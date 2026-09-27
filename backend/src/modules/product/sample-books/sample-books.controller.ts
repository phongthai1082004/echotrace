import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import type {ISampleBookService} from './sample-books.service.js';

@injectable()
export class SampleBookController {
	constructor(@inject('ISampleBookService') private readonly sampleBookService: ISampleBookService) {}

	list = async (req: AuthRequest, res: Response) => {
		const { search, type, category, status, order, limit, cursor } = req.query;
		const { items, nextCursor } = await this.sampleBookService.list({
			search: search as string | undefined,
			type: type as string | undefined,
			category: category as string | undefined,
			status: status as string | undefined,
			order: (order as string) || 'desc',
			limit: clampLimit(limit),
			cursor: cursor ? Number(cursor) : undefined,
		});
		res.json(ApiResponse.success({ items, nextCursor }));
	};

	getById = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const item = await this.sampleBookService.getById(id);
		res.json(ApiResponse.success(item));
	};

	create = async (req: AuthRequest, res: Response) => {
		const adminId = parseInt(req.userId!);
		const item = await this.sampleBookService.create(adminId, req.body);
		res.status(201).json(ApiResponse.success(item));
	};

	update = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const item = await this.sampleBookService.update(id, req.body);
		res.json(ApiResponse.success(item));
	};

	updateStatus = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const { status } = req.body;
		if (!status || !['draft', 'published', 'archive'].includes(status)) {
			throw new AppError(ErrorCode.ADMIN_INVALID_STATUS, 400);
		}
		const item = await this.sampleBookService.updateStatus(id, status);
		res.json(ApiResponse.success(item));
	};

	remove = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		await this.sampleBookService.remove(id);
		res.json(ApiResponse.message('Sample book deleted'));
	};

	explore = async (req: AuthRequest, res: Response) => {
		const items = await this.sampleBookService.explore(this.paginationParams(req));
		res.json(ApiResponse.success(items));
	};

	albums = async (req: AuthRequest, res: Response) => {
		const items = await this.sampleBookService.albums(this.paginationParams(req));
		res.json(ApiResponse.success(items));
	};

	private paginationParams(req: AuthRequest) {
		const q = req.query as Record<string, any>;
		return {
			cursor: q.cursor ? Number(q.cursor) : undefined,
			limit: q.limit ? Number(q.limit) : undefined,
			category: q.category ? String(q.category) : undefined,
		};
	}

	getPublishedById = async (req: AuthRequest, res: Response) => {
		const id = parseInt(String(req.params.id));
		const item = await this.sampleBookService.getPublishedById(id);
		res.json(ApiResponse.success(item));
	};
}

function clampLimit(v: unknown, def = 12): number {
	const n = Number(v);
	return Number.isFinite(n) ? Math.min(100, Math.max(1, Math.floor(n))) : def;
}
