import { injectable } from "tsyringe";
import { prisma } from "../../../lib/prisma.js";
import { AppError } from "../../middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";
import { SampleBookDTO, CreateSampleBookDTO, UpdateSampleBookDTO, SampleBookMapper } from "@echotrace/shared";

export abstract class ISampleBookService {
  abstract list(filters: { type?: string; category?: string; isActive?: boolean }): Promise<SampleBookDTO[]>;
  abstract getById(id: number): Promise<SampleBookDTO>;
  abstract create(adminId: number, data: CreateSampleBookDTO): Promise<SampleBookDTO>;
  abstract update(id: number, data: UpdateSampleBookDTO): Promise<SampleBookDTO>;
  abstract remove(id: number): Promise<void>;
  abstract explore(): Promise<SampleBookDTO[]>;
}

@injectable()
export class SampleBookService extends ISampleBookService {
  async list(filters: { type?: string; category?: string; isActive?: boolean } = {}) {
    const where: any = { isDelete: false };
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    const books = await prisma.sampleBook.findMany({
      where,
      orderBy: { id: "desc" },
    });
    return SampleBookMapper.toDTOList(books);
  }

  async getById(id: number) {
    const book = await prisma.sampleBook.findUnique({ where: { id } });
    if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);
    return SampleBookMapper.toDTO(book);
  }

  async create(adminId: number, data: CreateSampleBookDTO) {
    const book = await prisma.sampleBook.create({
      data: {
        createdBy: adminId,
        name: data.name ?? "Untitled sample",
        description: data.description ?? null,
        type: data.type ?? "TRAVEL",
        category: data.category ?? null,
        style: data.style ?? "PHOTOBOOK",
        font: data.font ?? "Inter",
        cover: data.cover ?? "softcover",
        coverUrl: data.coverUrl ?? null,
        paperHeight: data.paperHeight ?? null,
        paperWidth: data.paperWidth ?? null,
        isActive: data.isActive ?? true,
        status: data.status ?? "published",
        content: data.content ?? null,
      },
    });
    return SampleBookMapper.toDTO(book);
  }

  async update(id: number, data: UpdateSampleBookDTO) {
    const updateData: any = { ...data };
    if ("name" in data) updateData.name = data.name;
    if ("content" in data) updateData.content = data.content;
    const book = await prisma.sampleBook.update({ where: { id }, data: updateData });
    return SampleBookMapper.toDTO(book);
  }

  async remove(id: number) {
    const res = await prisma.sampleBook.updateMany({
      where: { id, isDelete: false },
      data: { isDelete: true, deletedAt: new Date() },
    });
    if (res.count === 0) throw new AppError(ErrorCode.NOT_FOUND, 404);
  }

  async explore() {
    const books = await prisma.sampleBook.findMany({
      where: { isDelete: false, isActive: true, status: "published" },
      orderBy: { id: "desc" },
    });
    return SampleBookMapper.toDTOList(books);
  }
}