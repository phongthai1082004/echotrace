import { injectable, inject } from "tsyringe";
import { BaseService } from "../../utils/base.service.js";
import { SupplierDTO, SupplierMapper, SupplierOption, AggregatedOptionsResponse, PriceOptionsResponse, CatalogSize } from "@echotrace/shared";
import { CreateSupplierDTO } from "../../dto/supplier/supplier.create.dto.js";
import { UpdateSupplierDTO } from "../../dto/supplier/supplier.update.dto.js";
import { optionCatalogCache } from "../../infrastructure/cache/cache.service.js";

type OptionGroups = { paperSizeOptions: any[]; paperOptions: any[]; coverOptions: any[] };

export abstract class ISupplierService {
  abstract getSupplierList(extraWhere?: any): Promise<SupplierDTO[]>;
  abstract getSupplierById(id: number): Promise<SupplierDTO>;
  abstract createSupplier(dto: CreateSupplierDTO): Promise<SupplierDTO>;
  abstract updateSupplier(id: number, dto: UpdateSupplierDTO): Promise<void>;
  abstract updateSupplierOptions(id: number, data: Partial<OptionGroups>): Promise<void>;
  abstract deleteSupplier(id: number): Promise<void>;
  abstract findAvailableSuppliers(query: { paperSize?: string; paper?: string; cover?: string }): Promise<any[]>;
  abstract getAggregatedOptions(): Promise<AggregatedOptionsResponse>;
  abstract getPriceOptions(query: { paperSize?: string; paper?: string; cover?: string }): Promise<PriceOptionsResponse>;
  abstract getOptionCatalog(type: string): Promise<SupplierOption[]>;
  abstract getOptionInfo(type: string, code: string): Promise<SupplierOption | null>;
}

@injectable()
export class SupplierService extends ISupplierService {
  constructor(
    @inject("SupplierBaseService") private readonly supplierBase: BaseService<any>,
    @inject("SupplierOptionBaseService") private readonly optionBase: BaseService<any>,
  ) {
    super();
  }

  async getSupplierList(extraWhere: any = { isDelete: undefined }) {
    const { items } = await this.supplierBase.findAll(
      { limit: 1000, order: "desc" },
      { allowedFilterFields: [] },
      extraWhere,
    );
    await this.attachOptions(items);
    return SupplierMapper.toDTOList(items);
  }

  async getSupplierById(id: number) {
    const supplier = await this.supplierBase.findById(id, { isDelete: undefined });
    await this.attachOptions([supplier]);
    return SupplierMapper.toDTO(supplier);
  }

  async createSupplier(dto: CreateSupplierDTO) {
    const supplier = await this.supplierBase.create({ ...dto });
    return SupplierMapper.toDTO(supplier);
  }

  async updateSupplier(id: number, dto: UpdateSupplierDTO) {
    const { status, ...rest } = dto;
    const data: any = { ...rest };

    // Convert status to banned/isDelete fields
    if (status !== undefined) {
      data.isDelete = status === "banned";
      data.deletedAt = status === "banned" ? new Date() : null;
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
    if (data.paperSizeOptions !== undefined) typesToReplace.push({ type: "paperSize", options: data.paperSizeOptions });
    if (data.paperOptions !== undefined) typesToReplace.push({ type: "paper", options: data.paperOptions });
    if (data.coverOptions !== undefined) typesToReplace.push({ type: "cover", options: data.coverOptions });
    if (!typesToReplace.length) return;

    for (const t of typesToReplace) {
      await this.replaceOptionsForType(id, t.type, t.options);
    }
  }

  async deleteSupplier(id: number) {
    await this.supplierBase.delete(id);
  }

  private async attachOptions(suppliers: any[]) {
    if (!suppliers.length) return;
    const ids = suppliers.map((s) => s.id);
    const { items } = await this.optionBase.findAll(
      { limit: 10000, order: "desc" },
      { allowedFilterFields: [] },
      { supplierId: { in: ids }, isDelete: false },
    );
    const bySupplier = new Map<number, Record<string, any[]>>();
    for (const o of items) {
      if (!bySupplier.has(o.supplierId)) bySupplier.set(o.supplierId, {});
      const g = bySupplier.get(o.supplierId)!;
      (g[o.type] ??= []).push({ code: o.code, name: o.name ?? {}, description: o.description ?? {}, width: o.width ?? null, height: o.height ?? null });
    }
    for (const s of suppliers) {
      const g = bySupplier.get(s.id) ?? {};
      s.paperSizeOptions = g.paperSize ?? [];
      s.paperOptions = g.paper ?? [];
      s.coverOptions = g.cover ?? [];
    }
  }

  // ponytail: soft-delete removed codes + upsert kept ones; handles @@unique([supplierId,type,code]) so re-adding a previously-removed code revives the row instead of colliding.
  private async replaceOptionsForType(supplierId: number, type: string, options: any[]) {
    const d: any = this.optionBase.delegate;
    const want = new Map<string, any>();
    for (const o of options ?? []) {
      want.set(String(o.code), {
        name: o.name ?? { vi: o.code, en: o.code, es: o.code },
        description: o.description ?? { vi: "", en: "", es: "" },
        width: o.width ?? null,
        height: o.height ?? null,
        price: o.price ?? null,
      });
    }
    const existing = await d.findMany({ where: { supplierId, type } });
    for (const row of existing) {
      if (want.has(row.code)) continue;
      await d.update({ where: { id: row.id }, data: { isDelete: true, deletedAt: new Date() } });
    }
    for (const [code, fields] of want) {
      const row = existing.find((e: any) => e.code === code);
      if (row) {
        await d.update({ where: { id: row.id }, data: { ...fields, isDelete: false, deletedAt: null } });
      } else {
        await d.create({ data: { supplierId, type, code, ...fields } });
      }
    }
    // ponytail: write-through — refresh cached catalog/info for this type so the picker stays in sync after add/update.
    await optionCatalogCache.delete(`catalog:${type}`);
    for (const [code, fields] of want) {
      await optionCatalogCache.set(`info:${type}:${code}`, {
        code,
        name: fields.name,
        description: fields.description,
        width: fields.width,
        height: fields.height,
        price: fields.price,
      });
    }
  }

  async findAvailableSuppliers(query: { paperSize?: string; paper?: string; cover?: string }) {
    const { items } = await this.supplierBase.findAll(
      { limit: 1000, order: "desc" },
      { allowedFilterFields: [] },
      { isDelete: false },
    );
    await this.attachOptions(items);
    const norm = (v: string | undefined) => (v ?? "").trim().toLowerCase();
    const matches = (s: any) =>
      (!query.paperSize || (s.paperSizeOptions ?? []).some((o: any) => norm(o.code) === norm(query.paperSize))) &&
      (!query.paper || (s.paperOptions ?? []).some((o: any) => norm(o.code) === norm(query.paper))) &&
      (!query.cover || (s.coverOptions ?? []).some((o: any) => norm(o.code) === norm(query.cover)));
    return items
      .filter(matches)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        coverOptions: s.coverOptions ?? [],
        paperOptions: s.paperOptions ?? [],
      }));
  }

  private uniqOptions(opts: SupplierOption[]): SupplierOption[] {
    return [...new Map(opts.map((o) => [o.code, o])).values()];
  }

  async getAggregatedOptions(): Promise<AggregatedOptionsResponse> {
    const { items } = await this.supplierBase.findAll(
      { limit: 1000, order: "desc" },
      { allowedFilterFields: [] },
      { isDelete: false },
    );
    await this.attachOptions(items);

    const sizeMap = new Map<string, CatalogSize>();
    const papers: SupplierOption[] = [];
    const covers: SupplierOption[] = [];
    for (const s of items) {
      for (const o of s.paperSizeOptions ?? []) sizeMap.set(o.code, { ...o, width: o.width ?? null, height: o.height ?? null });
      papers.push(...(s.paperOptions ?? []));
      covers.push(...(s.coverOptions ?? []));
    }
    return {
      sizes: [...sizeMap.values()],
      papers: this.uniqOptions(papers),
      covers: this.uniqOptions(covers),
    };
  }

  async getPriceOptions(query: { paperSize?: string; paper?: string; cover?: string }): Promise<PriceOptionsResponse> {
    const { items } = await this.supplierBase.findAll(
      { limit: 1000, order: "desc" },
      { allowedFilterFields: [] },
      { isDelete: false },
    );
    await this.attachOptions(items);
    const norm = (v?: string) => (v ?? "").trim().toLowerCase();
    const size = norm(query.paperSize);
    const paper = norm(query.paper);
    const cover = norm(query.cover);

    const inSize = items.filter((s: any) => !size || (s.paperSizeOptions ?? []).some((o: any) => norm(o.code) === size));
    const paperOpts = inSize.filter((s: any) => !cover || (s.coverOptions ?? []).some((o: any) => norm(o.code) === cover)).flatMap((s: any) => s.paperOptions ?? []);
    const coverOpts = inSize.filter((s: any) => !paper || (s.paperOptions ?? []).some((o: any) => norm(o.code) === paper)).flatMap((s: any) => s.coverOptions ?? []);
    return {
      papers: this.uniqOptions(paperOpts),
      covers: this.uniqOptions(coverOpts),
    };
  }

  // Lazy catalog/info for the admin option picker: unique codes by type + per-code info, LRU-cached.
  async getOptionCatalog(type: string): Promise<SupplierOption[]> {
    const cacheKey = `catalog:${type}`;
    const cached = await optionCatalogCache.get<SupplierOption[]>(cacheKey);
    if (cached) return cached;
    const rows: any[] = await this.optionBase.delegate.findMany({ where: { type, isDelete: false }, orderBy: { updatedAt: "desc" } });
    const byCode = new Map<string, SupplierOption>();
    for (const r of rows) {
      const cur = byCode.get(r.code);
      const entry = {
        code: r.code,
        name: r.name ?? { vi: r.code, en: r.code, es: r.code },
        description: r.description ?? { vi: "", en: "", es: "" },
        width: r.width ?? null,
        height: r.height ?? null,
        price: r.price ?? null,
      };
      if (!cur) byCode.set(r.code, entry);
      else for (const lng of ["vi", "en", "es"] as const) { // merge: fill missing langs from other suppliers
        if (!cur.name[lng]) cur.name[lng] = entry.name[lng];
      }
    }
    const list = [...byCode.values()];
    await optionCatalogCache.set(cacheKey, list);
    return list;
  }

  async getOptionInfo(type: string, code: string): Promise<SupplierOption | null> {
    const cacheKey = `info:${type}:${code}`;
    const cached = await optionCatalogCache.get<SupplierOption>(cacheKey);
    if (cached) return cached;
    const rows2: any[] = await this.optionBase.delegate.findMany({ where: { type, code, isDelete: false }, orderBy: { updatedAt: "desc" }, take: 1 });
    if (!rows2.length) return null;
    const row = rows2[0];
    const info = {
      code: row.code,
      name: row.name ?? { vi: row.code, en: row.code, es: row.code },
      description: row.description ?? { vi: "", en: "", es: "" },
      width: row.width ?? null,
      height: row.height ?? null,
      price: row.price ?? null,
    };
    await optionCatalogCache.set(cacheKey, info);
    return info;
  }
}