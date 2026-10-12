import { injectable, inject } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { SampleBookDTO, CreateSampleBookDTO, UpdateSampleBookDTO, SampleBookMapper } from '@echotrace/shared';
import { SampleBookCacheService } from '../catalog/sample-book.cache.service.js';
import { resolveContent } from '../catalog/merge-book-content.js';
import { SampleBookRepository } from './sample-books.repository.js';
import { Prisma } from '../../../../generated/prisma/client.js';

// Shape returned by findForStock — the full SampleBook row (or null).
export type SampleBookRow = Awaited<ReturnType<SampleBookRepository['findForStock']>>;

export interface ISampleBookService {
	list(params: {
		search?: string;
		type?: string;
		category?: string;
		status?: string;
		order?: string;
		limit?: number;
		cursor?: number;
	}): Promise<{ items: SampleBookDTO[]; nextCursor: number | null }>;
	getById(id: number): Promise<SampleBookDTO>;
	create(adminId: number, data: CreateSampleBookDTO): Promise<SampleBookDTO>;
	update(id: number, data: UpdateSampleBookDTO): Promise<SampleBookDTO>;
	updateStatus(id: number, status: string): Promise<SampleBookDTO>;
	remove(id: number): Promise<void>;
	explore(params?: { cursor?: number; limit?: number; category?: string }): Promise<{ items: SampleBookDTO[]; nextCursor: number | null }>;
	albums(params?: { cursor?: number; limit?: number; category?: string }): Promise<{ items: SampleBookDTO[]; nextCursor: number | null }>;
	getPublishedById(id: number): Promise<SampleBookDTO>;
	/**
	 * Returns the raw SampleBook row if it exists, is active, and has sufficient stock.
	 * Bypasses the DTO cache so callers get the full Prisma row (cover, paper, content, etc.).
	 * Returns null when the book is not found, inactive, deleted, or out of stock.
	 */
	getByIdForStock(id: number, quantity: number, tx?: Prisma.TransactionClient): Promise<SampleBookRow>;
}

@injectable()
export class SampleBookService implements ISampleBookService {
	constructor(
		@inject('ISampleBookCacheService') private readonly sampleCache: SampleBookCacheService,
		@inject('SampleBookRepository') private readonly sampleRepo: SampleBookRepository,
	) {}

	async list(
		params: { search?: string; type?: string; category?: string; status?: string; order?: string; limit?: number; cursor?: number } = {},
	) {
		const where: any = { isDelete: false };
		if (params.type) where.type = params.type;
		if (params.category) where.category = params.category;
		if (params.status) where.status = params.status;
		if (params.search) where.OR = [{ name: { contains: params.search, mode: 'insensitive' } }];
		const limit = params.limit || 12;
		const items = await this.sampleRepo.findMany(where, { id: params.order === 'asc' ? 'asc' : 'desc' }, limit, params.cursor);
		const nextCursor = items.length === limit ? items[items.length - 1].id : null;
		return { items: SampleBookMapper.toDTOList(items), nextCursor };
	}

	async getById(id: number) {
		const cached = await this.sampleCache.getSample<SampleBookDTO>(id);
		if (cached) return cached;
		const book = await this.sampleRepo.findById(id);
		if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);
		const dto = SampleBookMapper.toDTO(book);
		await this.sampleCache.setSample(id, dto);
		return dto;
	}

	async create(adminId: number, data: CreateSampleBookDTO) {
		const book = await this.sampleRepo.create({
			createdBy: adminId,
			name: data.name ?? 'Untitled sample',
			description: data.description ?? null,
			type: data.type ?? 'TEMPLATE',
			category: data.category ?? null,
			quantity: data.quantity ?? null,
			style: data.style ?? 'PHOTOBOOK',
			font: data.font ?? 'Inter',
			cover: data.cover ?? 'softcover',
			coverUrl: data.coverUrl ?? null,
			paperHeight: data.paperHeight ?? null,
			paperWidth: data.paperWidth ?? null,
			isActive: data.isActive ?? true,
			status: data.status ?? 'draft',
			content: data.content ?? null,
		});
		const dto = SampleBookMapper.toDTO(book);
		await this.sampleCache.setSample(dto.id, dto);
		await this.sampleCache.invalidateSamples();
		return dto;
	}

	async update(id: number, data: UpdateSampleBookDTO) {
		const updateData: any = { ...data };
		if ('name' in data) updateData.name = data.name;
		if ('content' in data) {
			const incoming = data.content as any;
			if (incoming?.changedPages) {
				const current = await this.sampleRepo.findById(id);
				updateData.content = resolveContent(current?.content, incoming);
			} else {
				updateData.content = data.content;
			}
		}

		if ('status' in data && !('isActive' in data)) updateData.isActive = data.status !== 'archive';
		const book = await this.sampleRepo.update(id, updateData);
		const dto = SampleBookMapper.toDTO(book);

		await this.sampleCache.setSample(id, dto);
		await this.sampleCache.invalidateSamples();
		return SampleBookMapper.toDTOList([book])[0];
	}

	async updateStatus(id: number, status: string) {
		const book = await this.sampleRepo.update(id, { status, isActive: status !== 'archive' });
		const dto = SampleBookMapper.toDTO(book);

		await this.sampleCache.setSample(id, dto);
		await this.sampleCache.invalidateSamples();
		return SampleBookMapper.toDTOList([book])[0];
	}

	async remove(id: number) {
		try {
			await this.sampleRepo.remove(id);
		} catch (e: any) {
			if (e?.code === 'P2025') throw new AppError(ErrorCode.NOT_FOUND, 404);
			throw e;
		}
		await this.sampleCache.invalidateSample(id);
		await this.sampleCache.invalidateSamples();
	}

	private visibleStatuses = ['published', 'active'];

	async explore(params: { cursor?: number; limit?: number; category?: string } = {}): Promise<{ items: SampleBookDTO[]; nextCursor: number | null }> {
		const all = await this.getExploreList();
		return this.paginate(all, params);
	}

	async albums(params: { cursor?: number; limit?: number; category?: string } = {}): Promise<{ items: SampleBookDTO[]; nextCursor: number | null }> {
		const all = await this.getAlbumList();
		return this.paginate(all, params);
	}

	private async getExploreList(): Promise<SampleBookDTO[]> {
		const cached = await this.sampleCache.getList<SampleBookDTO[]>('explore');
		if (cached) return cached;
		const books = await this.sampleRepo.findActiveByType('TEMPLATE', this.visibleStatuses);
		const dtos = SampleBookMapper.toDTOList(books);
		await this.sampleCache.setList('explore', dtos);
		return dtos;
	}

	private async getAlbumList(): Promise<SampleBookDTO[]> {
		const cached = await this.sampleCache.getList<SampleBookDTO[]>('albums');
		if (cached) return cached;
		const books = await this.sampleRepo.findActiveByType('ALBUM', this.visibleStatuses);
		const dtos = SampleBookMapper.toDTOList(books);
		await this.sampleCache.setList('albums', dtos);
		return dtos;
	}

	// cursor is the id of the last item seen (exclusive); pass 0 or omit for the first page.
	// This is stable: inserting or archiving items between fetches never causes skips/duplicates
	// because the position is anchored to a real row id, not an integer offset.
	private paginate(all: SampleBookDTO[], params: { cursor?: number; limit?: number; category?: string }) {
		const filtered = params.category ? all.filter((b) => b.category === params.category) : all;
		const limit = params.limit && params.limit > 0 ? params.limit : 12;
		// cursor = last seen id; take everything strictly before it (id < cursor).
		// On first page (no cursor / cursor=0) take from the start of the DESC-ordered list.
		const afterCursor = (params.cursor && params.cursor > 0)
			? filtered.filter((b) => b.id < params.cursor!)
			: filtered;
		const items = afterCursor.slice(0, limit);
		const nextCursor = items.length === limit ? items[items.length - 1].id : null;
		return { items, nextCursor };
	}

	async getPublishedById(id: number) {
		const cached = await this.sampleCache.getSample<SampleBookDTO>(id);
		if (cached && this.visibleStatuses.includes(cached.status) && cached.isActive) return cached;
		const book = await this.sampleRepo.findPublishedById(id, this.visibleStatuses);
		if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);
		const dto = SampleBookMapper.toDTO(book);
		await this.sampleCache.setSample(id, dto);
		return dto;
	}

	// copy metadata (cover, style, font, etc.) without an extra fetch.
	async getByIdForStock(id: number, quantity: number, tx?: Prisma.TransactionClient): Promise<SampleBookRow> {
		return this.sampleRepo.findForStock(id, quantity, tx);
	}
}
