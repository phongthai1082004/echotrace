export interface PaginationConfig {
  status?: string;
  customerId?: number;
  search?: string;
  sort?: string;
  order: string;
  limit: number;
  cursor?: number;
}

export interface PaginationOptions {
  searchFields?: string[];
  allowedSortFields?: string[];
  allowedFilterFields?: string[];   
  defaultSort?: string;
}

export class QueryProcessor {
  constructor(
    private query: any,
    private options: PaginationOptions = {}
  ) {}

  build() {
    const { search, sort, order, limit, cursor, ...rest } = this.query;
    const {
      searchFields = [],
      allowedSortFields = ['id'],
      allowedFilterFields = [],
      defaultSort = 'id',
    } = this.options;

    const sortField = sort && allowedSortFields.includes(sort) ? sort : defaultSort;

    const where: any = {};

    for (const key of allowedFilterFields) {
      const value = rest[key];
      if (value !== undefined && value !== '') {
        where[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    if (search && searchFields.length > 0) {
      where.OR = searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    // (Number(-5) is truthy, so a plain `|| 10` lets negatives through and Prisma throws).
    const limitNum = Number(limit);
    const take = Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : 10;

    const queryOptions: any = {
      where,
      orderBy: [{ [sortField]: order === 'desc' ? 'desc' : 'asc' }, { id: 'asc' }],
      take,
    };

    if (cursor) {
      queryOptions.cursor = { id: Number(cursor) };
      queryOptions.skip = 1;
    }

    return queryOptions;
  }
}