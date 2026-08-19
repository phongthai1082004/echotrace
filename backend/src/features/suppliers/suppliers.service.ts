import { injectable, inject } from 'tsyringe';
import { BaseService } from '../../utils/base.service.js';
import { SupplierDTO, SupplierMapper, SupplierOption, AggregatedOptionsResponse, CatalogSize } from '@echotrace/shared';
import { CreateSupplierDTO } from '../../dto/supplier/supplier.create.dto.js';
import { UpdateSupplierDTO } from '../../dto/supplier/supplier.update.dto.js';
import { optionCatalogCache } from '../../infrastructure/cache/cache.service.js';
import { prisma } from '../../../lib/prisma.js';

type OptionGroups = { paperSizeOptions: any[]; paperOptions: any[]; coverOptions: any[] };

export abstract class ISupplierService {
	abstract getSupplierList(extraWhere?: any): Promise<SupplierDTO[]>;
	abstract getSupplierById(id: number): Promise<SupplierDTO>;
	abstract createSupplier(dto: CreateSupplierDTO): Promise<SupplierDTO>;
	abstract updateSupplier(id: number, dto: UpdateSupplierDTO): Promise<void>;
	abstract updateSupplierOptions(id: number, data: Partial<OptionGroups>): Promise<void>;
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
	) {
		super();
	}

	async getSupplierList(extraWhere: any = { isDelete: undefined }) {
		const { items } = await this.supplierBase.findAll({ limit: 1000, order: 'desc' }, { allowedFilterFields: [] }, extraWhere);
		await this.attachOptions(items);
		return SupplierMapper.toDTOList(items);
	}

	async getSupplierById(id: number) {
		const supplier = await this.supplierBase.findById(id, { isDelete: undefined });
		await this.attachOptions([supplier]);
		return SupplierMapper.toDTO(supplier);
	}

	async createSupplier(dto: CreateSupplierDTO) {
		const { paperSizeOptions, paperOptions, coverOptions, ...rest } = dto as any;
		const supplier = await this.supplierBase.create({ ...rest });
		if (paperSizeOptions || paperOptions || coverOptions) {
			await this.updateSupplierOptions(supplier.id, { paperSizeOptions, paperOptions, coverOptions });
		}
		return SupplierMapper.toDTO(await this.getSupplierById(supplier.id));
	}

	async updateSupplier(id: number, dto: UpdateSupplierDTO) {
		const { status, paperSizeOptions, paperOptions, coverOptions, ...rest } = dto;
		const data: any = { ...rest };

		// Convert status to banned/isDelete fields
		if (status !== undefined) {
			data.isDelete = status === 'banned';
			data.deletedAt = status === 'banned' ? new Date() : null;
		}

		// Filter out undefined values to avoid Prisma validation errors
		const cleanData: any = {};
		Object.keys(data).forEach((key) => {
			if (data[key] !== undefined) cleanData[key] = data[key];
		});

		const result = await this.supplierBase.update(id, cleanData, { isDelete: undefined });
		return result;
	}

	async updateSupplierOptions(id: number, data: Partial<OptionGroups>) {
		const typesToReplace: { type: string; options: any[] }[] = [];
		if (data.paperSizeOptions !== undefined) typesToReplace.push({ type: 'paperSize', options: data.paperSizeOptions });
		if (data.paperOptions !== undefined) typesToReplace.push({ type: 'paper', options: data.paperOptions });
		if (data.coverOptions !== undefined) typesToReplace.push({ type: 'cover', options: data.coverOptions });
		if (!typesToReplace.length) return;

		for (const t of typesToReplace) {
			await this.replaceOptionsForType(id, t.type, t.options);
			await optionCatalogCache.delete(`catalog:${t.type}`);
		}
	}

	async deleteSupplier(id: number) {
		await this.supplierBase.delete(id);
	}

	private async attachOptions(suppliers: any[]) {
		if (!suppliers.length) return;
		const ids = suppliers.map((s) => s.id);
		const d = this.linkBase.delegate;
		const po = this.optionBase.delegate;
		const links: any[] = await d.findMany({
			where: { supplierId: { in: ids }, isDelete: false },
			orderBy: { id: 'desc' },
			take: 10000,
		});
		const poIds = [...new Set(links.map((l) => l.printOptionId))];
		const rows = poIds.length ? await po.findMany({ where: { id: { in: poIds } } }) : [];
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

	// ponytail: options giờ là danh mục GLOBAL — upsert PrintOption theo (type,code) rồi relink supplier qua SupplierPrintOption. Giá nằm trên PrintOption, không còn per-supplier.
	private async replaceOptionsForType(supplierId: number, type: string, options: any[]) {
		const want = new Map<string, any>();
		for (const o of options ?? []) {
			want.set(String(o.code), {
				name: o.name ?? { vi: o.code, en: o.code, es: o.code },
				description: o.description ?? { vi: '', en: '', es: '' },
				width: o.width ?? null,
				height: o.height ?? null,
				price: o.price ?? null,
			});
		}

		await prisma.$transaction(async (tx) => {
			// Upsert global catalog rows
			const poByCode = new Map<string, number>();
			for (const [code, fields] of want) {
				let row = await tx.printOption.findFirst({ where: { type, code } });
				if (!row) {
					row = await tx.printOption.create({ data: { type, code, ...fields } });
				} else {
					await tx.printOption.updateMany({ where: { id: row.id }, data: { ...fields, isDelete: false, deletedAt: null } });
				}
				poByCode.set(code, row.id);
			}

			// Relink supplier: diff current links vs wanted codes (kể cả đã soft-delete để revive, @@unique supplierId+printOptionId)
			const typePoIds = new Set((await tx.printOption.findMany({ where: { type } })).map((r: any) => r.id));
			const existing = await tx.supplierPrintOption.findMany({ where: { supplierId } });
			const existingByPo = new Map(existing.map((l: any) => [l.printOptionId, l]));
			const wantedIds = new Set([...poByCode.values()]);

			for (const l of existing) {
				if (!typePoIds.has(l.printOptionId)) continue;
				if (wantedIds.has(l.printOptionId)) continue;
				if (l.isDelete) continue;
				await tx.supplierPrintOption.updateMany({ where: { id: l.id }, data: { isDelete: true, deletedAt: new Date() } });
			}
			for (const id of wantedIds) {
				const row = existingByPo.get(id);
				if (row) {
					if (row.isDelete) await tx.supplierPrintOption.updateMany({ where: { id: row.id }, data: { isDelete: false, deletedAt: null } });
					continue;
				}
				await tx.supplierPrintOption.create({ data: { supplierId, printOptionId: id } });
			}
		});
	}

	private uniqOptions(opts: SupplierOption[]): SupplierOption[] {
		return [...new Map(opts.map((o) => [o.code, o])).values()];
	}

	// Aggregated từ danh mục GLOBAL: không còn merge theo từng supplier nữa.
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

	// Lazy catalog/info: đọc thẳng danh mục global, LRU-cached.
	async getOptionCatalog(type: string): Promise<SupplierOption[]> {
		const cacheKey = `catalog:${type}`;
		const cached = await optionCatalogCache.get<SupplierOption[]>(cacheKey);
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
		await optionCatalogCache.set(cacheKey, list);
		return list;
	}

	async getOptionInfo(type: string, code: string): Promise<SupplierOption | null> {
		const cacheKey = `info:${type}:${code}`;
		const cached = await optionCatalogCache.get<SupplierOption>(cacheKey);
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
		await optionCatalogCache.set(cacheKey, info);
		return info;
	}
}
