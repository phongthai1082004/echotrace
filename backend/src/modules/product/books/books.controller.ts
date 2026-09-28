import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {IBookService} from './books.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class BookController {
	constructor(@inject('IBookService') private readonly bookService: IBookService) {}

	getById = async (req: AuthRequest, res: Response) => {
		const id = parseInt(req.params.id as string);
		const userId = parseInt(req.userId!);
		const book = await this.bookService.getById(id, userId);
		res.json(ApiResponse.success(book));
	};

	getMyBooks = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		const books = await this.bookService.getMyBooks(userId);
		res.json(ApiResponse.success(books));
	};

 	create = async (req: AuthRequest, res: Response) => {
		const userId = parseInt(req.userId!);
		if (isNaN(userId)) throw new AppError(ErrorCode.AUTH_NOT_AUTHENTICATED, 401);
		const { title, content, paperHeight, paperWidth, attribution } = req.body;
		if (!content) throw new AppError(ErrorCode.BOOK_MISSING_CONTENT, 400);
		const book = await this.bookService.create(userId, {
			content: parseContentJson(content),
			title: checkTitle(title),
			paperHeight: toPaperSize(paperHeight),
			paperWidth: toPaperSize(paperWidth),
		}, attribution);
		res.status(201).json(ApiResponse.success(book));
	};

	remove = async (req: AuthRequest, res: Response) => {
		const id = parseInt(req.params.id as string);
		const userId = parseInt(req.userId!);
		await this.bookService.delete(id, userId);
		res.json(ApiResponse.message('Book deleted'));
	};

	updatePages = async (req: AuthRequest, res: Response) => {
		const id = parseInt(req.params.id as string);
		const userId = parseInt(req.userId!);
		const { content, title, paperHeight, paperWidth, flush } = req.body;
		const updateData: any = {};
		if (content) {
			updateData.content = parseContentJson(content);
		}
		if (title !== undefined) updateData.title = checkTitle(title);
		if (paperHeight !== undefined) updateData.paperHeight = toPaperSize(paperHeight);
		if (paperWidth !== undefined) updateData.paperWidth = toPaperSize(paperWidth);
		await this.bookService.updatePages(id, userId, updateData, { flush: flush === true });
		res.json(ApiResponse.success({ id }));
	};
}

function toNumOrNull(v: unknown): number | null | undefined {
	if (v === undefined) return undefined;
	if (v === null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

// JSON rác thì 400 chứ không 500; object mới hợp lệ (string/number lẻ không phải content).
function parseContentJson(v: unknown): any {
	let out = v;
	if (typeof out === 'string') {
		try {
			out = JSON.parse(out);
		} catch {
			throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { content: ['invalid JSON'] });
		}
	}
	if (!out || typeof out !== 'object') throw new AppError(ErrorCode.BOOK_MISSING_CONTENT, 400);
	return out;
}

function checkTitle(v: unknown): string | undefined {
	if (v === undefined) return undefined;
	if (typeof v !== 'string' || !v.trim()) throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { title: ['required'] });
	if (v.length > 200) throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { title: ['max 200 chars'] });
	return v;
}

// khổ giấy mm: rác → null (như cũ), âm/quá khổ → 400.
function toPaperSize(v: unknown): number | null | undefined {
	const n = toNumOrNull(v);
	if (n === undefined || n === null) return n;
	if (n <= 0 || n > 10000) throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { paperSize: ['out of range'] });
	return n;
}
