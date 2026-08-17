import { injectable } from "tsyringe";
import { prisma } from "../../../lib/prisma.js";
import { AppError } from "../../middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";
import { SampleBookDTO, CreateSampleBookDTO, UpdateSampleBookDTO, SampleBookMapper } from "@echotrace/shared";
import { sampleBookCache } from "../../infrastructure/cache/cache.service.js";

export abstract class ISampleBookService {
  abstract list(params: {
    search?: string; type?: string; kind?: string; status?: string;
    order?: string; limit?: number; cursor?: number;
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
  // ponytail: admin list is client-filtered + paginated, so no caching here — fresh rows every page.
  async list(params: { search?: string; type?: string; kind?: string; status?: string; order?: string; limit?: number; cursor?: number } = {}) {
    const where: any = { isDelete: false };
    if (params.type) where.type = params.type;
    if (params.kind) where.kind = params.kind;
    if (params.status) where.status = params.status;
    if (params.search) where.OR = [{ name: { contains: params.search, mode: "insensitive" } }];
    const limit = params.limit || 12;
    const items = await prisma.sampleBook.findMany({
      where,
      orderBy: { id: params.order === "asc" ? "asc" : "desc" },
      take: limit,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;
    return { items: SampleBookMapper.toDTOList(items), nextCursor };
  }

  async getById(id: number) {
    const cached = await sampleBookCache.get<SampleBookDTO>(`sample:${id}`);
    if (cached) return cached;
    const book = await prisma.sampleBook.findUnique({ where: { id } });
    if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);
    const dto = SampleBookMapper.toDTO(book);
    await sampleBookCache.set(`sample:${id}`, dto);
    return dto;
  }

  async create(adminId: number, data: CreateSampleBookDTO) {
    // ponytail: new sample books start as draft, not published.
    const book = await prisma.sampleBook.create({
      data: {
        createdBy: adminId,
        name: data.name ?? "Untitled sample",
        description: data.description ?? null,
        type: data.type ?? "TRAVEL",
        kind: data.kind ?? "TEMPLATE",
        category: data.category ?? null,
        style: data.style ?? "PHOTOBOOK",
        font: data.font ?? "Inter",
        cover: data.cover ?? "softcover",
        coverUrl: data.coverUrl ?? null,
        paperHeight: data.paperHeight ?? null,
        paperWidth: data.paperWidth ?? null,
        isActive: data.isActive ?? true,
        status: data.status ?? "draft",
        content: data.content ?? null,
      },
    });
    const dto = SampleBookMapper.toDTO(book);
    await sampleBookCache.set(`sample:${dto.id}`, dto);
    await sampleBookCache.delete("samples:explore", "samples:albums");
    return dto;
  }

  async update(id: number, data: UpdateSampleBookDTO) {
    const updateData: any = { ...data };
    if ("name" in data) updateData.name = data.name;
    if ("content" in data) updateData.content = data.content;
    // ponytail: status drives visibility — archive hides from explore, everything else shows
    if ("status" in data && !("isActive" in data)) updateData.isActive = data.status !== "archive";
    const book = await prisma.sampleBook.update({ where: { id }, data: updateData });
    const dto = SampleBookMapper.toDTO(book);
    // ponytail: write-through so status/size changes are visible immediately.
    await sampleBookCache.set(`sample:${id}`, dto);
    await sampleBookCache.delete("samples:explore", "samples:albums");
    return dto;
  }

  async updateStatus(id: number, status: string) {
    const book = await prisma.sampleBook.update({
      where: { id },
      data: { status, isActive: status !== "archive" },
    });
    const dto = SampleBookMapper.toDTO(book);
    // ponytail: status drives explore visibility — write-through so it applies immediately.
    await sampleBookCache.set(`sample:${id}`, dto);
    await sampleBookCache.delete("samples:explore", "samples:albums");
    return dto;
  }

  async remove(id: number) {
    // ponytail: "delete" now archives — the item stays in the admin list with status archive
    const res = await prisma.sampleBook.updateMany({
      where: { id, isDelete: false },
      data: { status: "archive", isActive: false },
    });
    if (res.count === 0) throw new AppError(ErrorCode.NOT_FOUND, 404);
    await sampleBookCache.delete(`sample:${id}`, "samples:explore", "samples:albums");
  }

  // statuses that are public in the customer explore grid
  private visibleStatuses = ["published", "active"];

  async explore() {
    const cached = await sampleBookCache.get<SampleBookDTO[]>("samples:explore");
    if (cached) return cached;
    const books = await prisma.sampleBook.findMany({
      where: { isDelete: false, isActive: true, status: { in: this.visibleStatuses }, kind: "TEMPLATE" },
      orderBy: { id: "desc" },
    });
    const dtos = SampleBookMapper.toDTOList(books);
    // ponytail: published list cached for the customer explore grid; invalidated on write.
    await sampleBookCache.set("samples:explore", dtos);
    return dtos;
  }

  async albums() {
    const cached = await sampleBookCache.get<SampleBookDTO[]>("samples:albums");
    if (cached) return cached;
    const books = await prisma.sampleBook.findMany({
      where: { isDelete: false, isActive: true, status: { in: this.visibleStatuses }, kind: "ALBUM" },
      orderBy: { id: "desc" },
    });
    const dtos = SampleBookMapper.toDTOList(books);
    // ponytail: same caching contract as explore.
    await sampleBookCache.set("samples:albums", dtos);
    return dtos;
  }

  async getPublishedById(id: number) {
    const cached = await sampleBookCache.get<SampleBookDTO>(`sample:${id}`);
    if (cached && this.visibleStatuses.includes(cached.status) && cached.isActive) return cached;
    const book = await prisma.sampleBook.findFirst({
      where: { id, isDelete: false, isActive: true, status: { in: this.visibleStatuses } },
    });
    if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);
    const dto = SampleBookMapper.toDTO(book);
    await sampleBookCache.set(`sample:${id}`, dto);
    return dto;
  }
}