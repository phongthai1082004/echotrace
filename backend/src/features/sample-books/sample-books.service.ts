import { injectable, inject } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { SampleBookDTO, CreateSampleBookDTO, UpdateSampleBookDTO, SampleBookMapper } from '@echotrace/shared';
import { SampleBookCacheService } from '../../infrastructure/cache/sample-book.cache.service.js';
import { resolveContent } from '../../lib/merge-book-content.js';

export abstract class ISampleBookService {
	abstract list(params: {
		search?: string;
		type?: string;
		category?: string;
		status?: string;
		order?: string;
		limit?: number;
		cursor?: number;
	}): Promise<{ items: SampleBookDTO[]; nextCursor: number | null }>;
	abstract getById(id: number): Promise<SampleBookDTO>;
	abstract create(adminId: number, data: CreateSampleBookDTO): Promise<SampleBookDTO>;
	abstract update(id: number, data: UpdateSampleBookDTO): Promise<SampleBookDTO>;
	abstract updateStatus(id: number, status: string): Promise<SampleBookDTO>;
	abstract remove(id: number): Promise<void>;
	abstract explore(): Promise<SampleBookDTO[]>;
	abstract albums(): Promise<SampleBookDTO[]>;
	abstract getPublishedById(id: number): Promise<SampleBookDTO>;
}

@injectable()
export class SampleBookService extends ISampleBookService {
	constructor(@inject('ISampleBookCacheService') private readonly sampleCache: SampleBookCacheService) {
		super();
	}

	// ponytail: admin list is client-filtered + paginated, so no caching here — fresh rows every page.
	async list(
		params: { search?: string; type?: string; category?: string; status?: string; order?: string; limit?: number; cursor?: number } = {},
	) {
		const where: any = { isDelete: false };
		if (params.type) where.type = params.type;
		if (params.category) where.category = params.category;
		if (params.status) where.status = params.status;
		if (params.search) where.OR = [{ name: { contains: params.search, mode: 'insensitive' } }];
		const limit = params.limit || 12;
		const items = await prisma.sampleBook.findMany({
			where,
			orderBy: { id: params.order === 'asc' ? 'asc' : 'desc' },
			take: limit,
			...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
		});
		const nextCursor = items.length === limit ? items[items.length - 1].id : null;
		return { items: SampleBookMapper.toDTOList(items), nextCursor };
	}

	async getById(id: number) {
		const cached = await this.sampleCache.getSample<SampleBookDTO>(id);
		if (cached) return cached;
		const book = await prisma.sampleBook.findUnique({ where: { id } });
		if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);
		const dto = SampleBookMapper.toDTO(book);
		await this.sampleCache.setSample(id, dto);
		return dto;
	}

	async create(adminId: number, data: CreateSampleBookDTO) {
		// ponytail: new sample books start as draft, not published.
		const book = await prisma.sampleBook.create({
			data: {
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
			},
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
				const current = await prisma.sampleBook.findUnique({ where: { id }, select: { content: true } });
				updateData.content = resolveContent(current?.content, incoming);
			} else {
				updateData.content = data.content;
			}
		}
		// ponytail: status drives visibility — archive hides from explore, everything else shows
		if ('status' in data && !('isActive' in data)) updateData.isActive = data.status !== 'archive';
		const book = await prisma.sampleBook.update({ where: { id }, data: updateData });
		const dto = SampleBookMapper.toDTO(book);
		// ponytail: write-through so status/size changes are visible immediately.
		await this.sampleCache.setSample(id, dto);
		await this.sampleCache.invalidateSamples();
		return SampleBookMapper.toDTOList([book])[0];
	}

	async updateStatus(id: number, status: string) {
		const book = await prisma.sampleBook.update({
			where: { id },
			data: { status, isActive: status !== 'archive' },
		});
		const dto = SampleBookMapper.toDTO(book);
		// ponytail: status drives explore visibility — write-through so it applies immediately.
		await this.sampleCache.setSample(id, dto);
		await this.sampleCache.invalidateSamples();
		return SampleBookMapper.toDTOList([book])[0];
	}

	async remove(id: number) {
		// ponytail: "delete" now archives — the item stays in the admin list with status archive
		const res = await prisma.sampleBook.updateMany({
			where: { id, isDelete: false },
			data: { status: 'archive', isActive: false },
		});
		if (res.count === 0) throw new AppError(ErrorCode.NOT_FOUND, 404);
		await this.sampleCache.invalidateSample(id);
		await this.sampleCache.invalidateSamples();
	}

	// statuses that are public in the customer explore grid
	private visibleStatuses = ['published', 'active'];

	async explore() {
		const cached = await this.sampleCache.getList<SampleBookDTO[]>('explore');
		if (cached) return cached;
		const books = await prisma.sampleBook.findMany({
			where: { isDelete: false, isActive: true, status: { in: this.visibleStatuses }, type: 'TEMPLATE' },
			orderBy: { id: 'desc' },
		});
		const dtos = SampleBookMapper.toDTOList(books);
		// ponytail: published list cached for the customer explore grid; invalidated on write.
		await this.sampleCache.setList('explore', dtos);
		return dtos;
	}

	async albums() {
		const cached = await this.sampleCache.getList<SampleBookDTO[]>('albums');
		if (cached) return cached;
		const books = await prisma.sampleBook.findMany({
			where: { isDelete: false, isActive: true, status: { in: this.visibleStatuses }, type: 'ALBUM' },
			orderBy: { id: 'desc' },
		});
		const dtos = SampleBookMapper.toDTOList(books);
		// ponytail: same caching contract as explore.
		await this.sampleCache.setList('albums', dtos);
		return dtos;
	}

	async getPublishedById(id: number) {
		const cached = await this.sampleCache.getSample<SampleBookDTO>(id);
		if (cached && this.visibleStatuses.includes(cached.status) && cached.isActive) return cached;
		const book = await prisma.sampleBook.findFirst({
			where: { id, isDelete: false, isActive: true, status: { in: this.visibleStatuses } },
		});
		if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);
		const dto = SampleBookMapper.toDTO(book);
		await this.sampleCache.setSample(id, dto);
		return dto;
	}
}
