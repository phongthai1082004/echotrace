import { QueryProcessor, PaginationConfig, PaginationOptions } from '@echotrace/shared';

type FindManyDelegate = { findMany(args: any): Promise<any[]> };

// không cần class repo. Dùng trực tiếp delegate (prisma.x) để thống nhất data-access.
export async function paginate(
	delegate: FindManyDelegate,
	config: PaginationConfig,
	options: PaginationOptions = {},
	extraWhere: Record<string, any> = {},
): Promise<{ items: any[]; nextCursor: number | null }> {
	const q: any = new QueryProcessor(config, options).build();
	q.where = Object.assign({}, q.where, { isDelete: false }, extraWhere);
	// nextCursor (which used to make "Next" show an empty table on exact-multiple totals).
	const limit = Number(config.limit);
	const items = await delegate.findMany({ ...q, take: limit + 1 });
	const hasNext = items.length > limit;
	const page = hasNext ? items.slice(0, limit) : items;
	const nextCursor = hasNext ? (page[page.length - 1]?.id ?? null) : null;
	return { items: page, nextCursor };
}
