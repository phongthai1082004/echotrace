import { injectable, inject } from 'tsyringe';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { SupplierDTO, SupplierMapper, SupplierOption, AggregatedOptionsResponse, CatalogSize } from '@echotrace/shared';
import { CreateSupplierDTO } from '@echotrace/shared';
import { UpdateSupplierDTO } from '@echotrace/shared';
import { OptionCatalogCacheService } from '../../product/catalog/option-catalog.cache.service.js';
import { paginate } from '../../../shared/utils/paginate.js';
import { SupplierRepository } from './suppliers.repository.js';

export interface ISupplierService {
	getSupplierList(
		params: { search?: string; field?: string; order?: string; limit?: number; cursor?: number },
		extraWhere?: any,
	): Promise<{ items: SupplierDTO[]; nextCursor: number | null }>;
	getSupplierById(id: number): Promise<SupplierDTO>;
	createSupplier(dto: CreateSupplierDTO): Promise<SupplierDTO>;
	updateSupplier(id: number, dto: UpdateSupplierDTO): Promise<void>;
	updateSupplierOptions(id: number, optionIds: number[]): Promise<void>;
	deleteSupplier(id: number): Promise<void>;
	getAggregatedOptions(): Promise<AggregatedOptionsResponse>;
	getOptionCatalog(type: string): Promise<SupplierOption[]>;
	getOptionInfo(type: string, code: string): Promise<SupplierOption | null>;
}

@injectable()
export class SupplierService implements ISupplierService {
	constructor(
		@inject('IOptionCatalogCacheService') private readonly optionCache: OptionCatalogCacheService,
		@inject('SupplierRepository') private readonly supplierRepo: SupplierRepository,
	) {
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
		const { items, nextCursor } = await paginate(
			this.supplierRepo.client.supplier,
			{ search: params.search, order: params.order || 'desc', limit: params.limit || 50, cursor: params.cursor },
			{ searchFields, allowedFilterFields: [] },
			extraWhere,
		);
		await this.attachOptions(items);
		return { items: SupplierMapper.toDTOList(items), nextCursor };
	}

	async getSupplierById(id: number) {
		const supplier = await this.supplierRepo.findSupplierById(id);
		if (!supplier) throw new AppError(ErrorCode.NOT_FOUND, 404);
		await this.attachOptions([supplier]);
		return SupplierMapper.toDTO(supplier);
	}

	async createSupplier(dto: CreateSupplierDTO) {
		const { optionIds, ...rest } = dto as any;
		const supplier = await this.supplierRepo.createSupplier({ ...rest });
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

		await this.supplierRepo.updateSupplier(id, cleanData);
		if (Array.isArray(optionIds)) {
			await this.updateSupplierOptions(id, optionIds);
		}
	}



	async updateSupplierOptions(id: number, optionIds: number[] = []) {
		const wanted = new Set(optionIds.map(Number).filter(Boolean));
		await this.supplierRepo.client.$transaction(async (tx) => {
			const existing = await tx.supplierPrintOption.findMany({ where: { supplierId: id } });
			const existingById = new Map(existing.map((l: any) => [l.printOptionId, l]));
			const toDeleteIds = existing
				.filter((l: any) => !wanted.has(l.printOptionId) && !l.isDelete)
				.map((l: any) => l.id);
			if (toDeleteIds.length) {
				await tx.supplierPrintOption.updateMany({
					where: { id: { in: toDeleteIds } },
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
		const result = await this.supplierRepo.deleteSupplier(id);
		if (result.count === 0) throw new AppError(ErrorCode.NOT_FOUND, 404);
	}

	private async attachOptions(suppliers: any[]) {
		if (!suppliers.length) return;
		const ids = suppliers.map((s) => s.id);

		const links: any[] = await this.supplierRepo.listSupplierPrintOptions(ids);
		const poIds = [...new Set(links.map((l) => l.printOptionId))];
		const rows = poIds.length
			? await this.supplierRepo.listPrintOptionsByIds(poIds)
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
		const rows = (await this.supplierRepo.listActivePrintOptions()) as any[];
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
		const rows = (await this.supplierRepo.listPrintOptionsByType(type)) as any[];
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
		const row = (await this.supplierRepo.findPrintOptionByTypeCode(type, code)) as any;
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
