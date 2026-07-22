import { QueryProcessor, PaginationConfig, PaginationOptions } from "./pagination.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "../errors/error-codes.js";

interface SoftDeletable {
  id: number;
  isDelete: boolean;
  deletedAt: Date | null;
}

export interface Delegate<T, WhereInput, WhereUniqueInput, CreateInput = any, UpdateInput = any> {
  findMany(args: {
    where?: WhereInput;
    orderBy?: any;
    take?: number;
    skip?: number;
    cursor?: WhereUniqueInput;
  }): Promise<T[]>;

  findFirst(args: { where: WhereInput }): Promise<T | null>;

  create(args: any): Promise<T>;

  updateMany(args: { where: WhereInput; data: UpdateInput }): Promise<{ count: number }>;

  deleteMany(args: { where: WhereInput }): Promise<{ count: number }>;
}

export class BaseService<T extends SoftDeletable, WhereInput extends Record<string, any> = Record<string, any>, WhereUniqueInput extends Record<string, any> = { id: number }, CreateInput = any, UpdateInput = any> {
  public delegate: Delegate<T, WhereInput, WhereUniqueInput, CreateInput, UpdateInput>;

  constructor(delegate: Delegate<T, WhereInput, WhereUniqueInput, CreateInput, UpdateInput>) {
    this.delegate = delegate;
  }

  async findAll(config: PaginationConfig, options: PaginationOptions = {}, extraWhere: Partial<WhereInput> = {}): Promise<{ items: T[]; nextCursor: number | null }> {
    const queryConfig: any = new QueryProcessor(config, options).build();

    queryConfig.where = Object.assign({}, queryConfig.where, { isDelete: false }, extraWhere);

    const items: T[] = await this.delegate.findMany(queryConfig);
    const nextCursor = items.length === config.limit ? items[items.length - 1].id : null;

    return { items: items, nextCursor: nextCursor };
  }

  async findById(id: number, extraWhere: Partial<WhereInput> = {}): Promise<T> {
    const where: any = Object.assign({ id: id, isDelete: false }, extraWhere);

    const item = await this.delegate.findFirst({ where: where });
    if (!item) {
      throw new AppError(ErrorCode.NOT_FOUND, 404);
    }
    return item;
  }

  async create(data: CreateInput): Promise<T> {
    return this.delegate.create({ data: data });
  }

  async update(id: number, data: UpdateInput, extraWhere: Partial<WhereInput> = {}): Promise<void> {
    const where: any = Object.assign({ id: id, isDelete: false }, extraWhere);

    const result = await this.delegate.updateMany({ where: where, data: data });
    if (result.count === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 404);
    }
  }

  async delete(id: number, extraWhere: Partial<WhereInput> = {}): Promise<void> {
    const where: any = Object.assign({ id: id, isDelete: false }, extraWhere);
    const updateData: any = { isDelete: true, deletedAt: new Date() };

    const result = await this.delegate.updateMany({ where: where, data: updateData });
    if (result.count === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 404);
    }
  }

  async hardDelete(id: number, extraWhere: Partial<WhereInput> = {}): Promise<void> {
    const where: any = Object.assign({ id: id }, extraWhere);

    const result = await this.delegate.deleteMany({ where: where });
    if (result.count === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 404);
    }
  }
}