import { injectable, inject } from 'tsyringe';
import { BaseService } from '../../utils/base.service.js';
import { SupplierDTO, SupplierMapper, SupplierOption, AggregatedOptionsResponse, CatalogSize } from '@echotrace/shared';
import { CreateSupplierDTO } from '../../dto/supplier/supplier.create.dto.js';
import { UpdateSupplierDTO } from '../../dto/supplier/supplier.update.dto.js';
import { OptionCatalogCacheService } from '../../infrastructure/cache/option-catalog.cache.service.js';
import { prisma } from '../../../lib/prisma.js';

export abstract class ISupplierService {
	abstract getSupplierList(
		params: { search?: string; field?: string; order?: string; limit?: number; cursor?: number },
		extraWhere?: any,
	): Promise<{ items: SupplierDTO[]; nextCursor: number | null }>;
	abstract getSupplierById(id: number): Promise<SupplierDTO>;
	abstract createSupplier(dto: CreateSupplierDTO): Promise<SupplierDTO>;
	abstract updateSupplier(id: number, dto: UpdateSupplierDTO): Promise<void>;
	abstract updateSupplierOptions(id: number, optionIds: number[]): Promise<void>;
	abstract deleteSupplier(id: number): Promise<void>;
	abstract getAggregatedOptions(): Promise<AggregatedOptionsResponse>;
	abstract getOptionCatalog(type: string): Promise<SupplierOption[]>;
	abstract getOptionInfo(type: string, code: string): Promise<SupplierOption | null>;
}

@injectable()
export class SupplierService extends ISupplierService {
	constructor(
		@inject('SupplierBaseService') private readonly supplierBase: BaseService<any>,
		@inject('PrintOptionBaseService') private readonly optionBase: BaseService<any>,
		@inject('SupplierPrintOptionBaseService') private readonly linkBase: BaseService<any>,
		@inject('IOptionCatalogCacheService') private readonly optionCache: OptionCatalogCacheService,
	) {
		super();
	}

	async getSupplierList(
		params: { search?: string; field?: string; order?: string; limit?: number; cursor?: number } = {},
		extraWhere: any = { isDelete: undefined },
	) {
		const searchFields =
			params.field === 'name'
				? ['name']
				: params.field === 'email'
					? ['email']
					: params.field === 'contact'
						? ['contact']
						: ['name', 'email', 'contact'];
		const { items, nextCursor } = await this.supplierBase.findAll(
			{ search: params.search, order: params.order || 'desc', limit: params.limit || 50, cursor: params.cursor },
			{ searchFields, allowedFilterFields: [] },
			extraWhere,
		);
		await this.attachOptions(items);
		return { items: SupplierMapper.toDTOList(items), nextCursor };
	}

	async getSupplierById(id: number) {
		const supplier = await this.supplierBase.findById(id, { isDelete: undefined });
		await this.attachOptions([supplier]);
		return SupplierMapper.toDTO(supplier);
	}

	async createSupplier(dto: CreateSupplierDTO) {
		const { optionIds, ...rest } = dto as any;
		const supplier = await this.supplierBase.create({ ...rest });
		if (Array.isArray(optionIds) && optionIds.length) {
			await this.updateSupplierOptions(supplier.id, optionIds);
		}
		return SupplierMapper.toDTO(await this.getSupplierById(supplier.id));
	}

	async updateSupplier(id: number, dto: UpdateSupplierDTO) {
		const { status, optionIds, ...rest } = dto;
		const data: any = { ...rest };


		if (status !== undefined) {
			data.isDelete = status === 'banned';
			data.deletedAt = status === 'banned' ? new Date() : null;
		}


		const cleanData: any = {};
		Object.keys(data).forEach((key) => {
			if (data[key] !== undefined) cleanData[key] = data[key];
		});

		const result = await this.supplierBase.update(id, cleanData, { isDelete: undefined });
		if (Array.isArray(optionIds)) {
			await this.updateSupplierOptions(id, optionIds);
		}
		return result;
	}



	async updateSupplierOptions(id: number, optionIds: number[] = []) {
		const wanted = new Set(optionIds.map(Number).filter(Boolean));
		await prisma.$transaction(async (tx) => {
			const existing = await tx.supplierPrintOption.findMany({ where: { supplierId: id } });
			const existingById = new Map(existing.map((l: any) => [l.printOptionId, l]));
			for (const l of existing) {
				if (wanted.has(l.printOptionId)) continue;
				if (l.isDelete) continue;
				await tx.supplierPrintOption.updateMany({
					where: { id: l.id },
					data: { isDelete: true, deletedAt: new Date() },
				});
			}
			for (const poId of wanted) {
				const row = existingById.get(poId);
				if (row) {
					if (row.isDelete) {
						await tx.supplierPrintOption.updateMany({ where: { id: row.id }, data: { isDelete: false, deletedAt: null } });
					}
					continue;
				}
				await tx.supplierPrintOption.create({ data: { supplierId: id, printOptionId: poId } });
			}
		});
		await this.optionCache.invalidateCatalogForTypes('paperSize', 'paper', 'cover');
	}

	async deleteSupplier(id: number) {
		await this.supplierBase.delete(id);
	}

	private async attachOptions(suppliers: any[]) {
		if (!suppliers.length) return;
		const ids = suppliers.map((s) => s.id);

		const links: any[] = await prisma.supplierPrintOption.findMany({
			where: { supplierId: { in: ids }, isDelete: false },
			orderBy: { id: 'desc' },
			take: 10000,
			select: { supplierId: true, printOptionId: true },
		});
		const poIds = [...new Set(links.map((l) => l.printOptionId))];
		const rows = poIds.length
			? await prisma.printOption.findMany({
					where: { id: { in: poIds } },
					select: { id: true, type: true, code: true, name: true, description: true, width: true, height: true, price: true },
				})
			: [];
		const optionById = new Map(rows.map((r: any) => [r.id, r]));
		const bySupplier = new Map<number, Record<string, any[]>>();
		for (const l of links) {
			const r = optionById.get(l.printOptionId);
			if (!r) continue;
			const g = bySupplier.get(l.supplierId) ?? (bySupplier.set(l.supplierId, {}), bySupplier.get(l.supplierId)!);
			(g[r.type] ??= []).push({
				code: r.code,
				name: r.name ?? {},
				description: r.description ?? {},
				width: r.width ?? null,
				height: r.height ?? null,
				price: r.price ?? null,
			});
		}
		for (const s of suppliers) {
			const g = bySupplier.get(s.id) ?? {};
			s.paperSizeOptions = g.paperSize ?? [];
			s.paperOptions = g.paper ?? [];
			s.coverOptions = g.cover ?? [];
		}
	}

	private uniqOptions(opts: SupplierOption[]): SupplierOption[] {
		return [...new Map(opts.map((o) => [o.code, o])).values()];
	}


	async getAggregatedOptions(): Promise<AggregatedOptionsResponse> {
		const d = this.optionBase.delegate;
		const rows = await d.findMany({ where: { isDelete: false }, orderBy: { type: 'asc' } });
		const sizes: CatalogSize[] = [];
		const papers: SupplierOption[] = [];
		const covers: SupplierOption[] = [];
		for (const r of rows) {
			const o = {
				code: r.code,
				name: r.name ?? { vi: r.code, en: r.code, es: r.code },
				description: r.description ?? { vi: '', en: '', es: '' },
				width: r.width ?? null,
				height: r.height ?? null,
				price: r.price ?? null,
			};
			if (r.type === 'paperSize') sizes.push(o as CatalogSize);
			else if (r.type === 'paper') papers.push(o);
			else if (r.type === 'cover') covers.push(o);
		}
		return { sizes, papers: this.uniqOptions(papers), covers: this.uniqOptions(covers) };
	}


	async getOptionCatalog(type: string): Promise<SupplierOption[]> {
		const cached = await this.optionCache.getCatalog<SupplierOption[]>(type);
		if (cached) return cached;
		const rows: any[] = await this.optionBase.delegate.findMany({
			where: { type, isDelete: false },
			orderBy: { updatedAt: 'desc' },
		});
		const list = rows.map((r) => ({
			code: r.code,
			name: r.name ?? { vi: r.code, en: r.code, es: r.code },
			description: r.description ?? { vi: '', en: '', es: '' },
			width: r.width ?? null,
			height: r.height ?? null,
			price: r.price ?? null,
		}));
		await this.optionCache.setCatalog(type, list);
		return list;
	}

	async getOptionInfo(type: string, code: string): Promise<SupplierOption | null> {
		const cached = await this.optionCache.getInfo<SupplierOption>(type, code);
		if (cached) return cached;
		const row = await this.optionBase.delegate.findFirst({ where: { type, code, isDelete: false } });
		if (!row) return null;
		const info = {
			code: row.code,
			name: row.name ?? { vi: row.code, en: row.code, es: row.code },
			description: row.description ?? { vi: '', en: '', es: '' },
			width: row.width ?? null,
			height: row.height ?? null,
			price: row.price ?? null,
		};
		await this.optionCache.setInfo(type, code, info);
		return info;
	}
}
