import { QueryProcessor, PaginationConfig, PaginationOptions } from '@echotrace/shared';

type FindManyDelegate = { findMany(args: any): Promise<any[]> };

// ponytail: thay thế BaseService.findAll — chỉ là cursor pagination + soft-delete,
// không cần class repo. Dùng trực tiếp delegate (prisma.x) để thống nhất data-access.
export async function paginate(
	delegate: FindManyDelegate,
	config: PaginationConfig,
	options: PaginationOptions = {},
	extraWhere: Record<string, any> = {},
): Promise<{ items: any[]; nextCursor: number | null }> {
	const q: any = new QueryProcessor(config, options).build();
	q.where = Object.assign({}, q.where, { isDelete: false }, extraWhere);
	const items = await delegate.findMany(q);
	const nextCursor = items.length === (config.limit as number) ? (items[items.length - 1]?.id ?? null) : null;
	return { items, nextCursor };
}
