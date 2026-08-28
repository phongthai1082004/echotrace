import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { AppError } from '../../middleware/app.error.js';

// ponytail: tính tổng số lượng theo SampleBook từ danh sách bookId + items.
// Chỉ tính các Book có sampleBookId (album); photobook (null) bỏ qua.
// db = tx (trong transaction) hoặc prisma (ngoài) — để chạy trong Serializable khi cần.
export async function sumNeedBySampleBook(
	bookIds: number[],
	items: { bookId: number; quantity?: number }[],
	db: Prisma.TransactionClient | typeof prisma,
): Promise<Map<number, number>> {
	const books = await db.book.findMany({
		where: { id: { in: bookIds } },
		select: { id: true, sampleBookId: true },
	});
	const need = new Map<number, number>();
	for (const b of books) {
		if (b.sampleBookId == null) continue;
		const qty = items.find((i) => i.bookId === b.id)?.quantity ?? 1;
		need.set(b.sampleBookId, (need.get(b.sampleBookId) ?? 0) + qty);
	}
	return need;
}

// ponytail: hoàn tồn kho album khi đơn rời PENDING_PAYMENT chưa trả (hết hạn / user huỷ / webhook cancel).
// orderItems là snapshot, mỗi item có bookId + quantity; chỉ cộng lại cho SampleBook có quantity (null = unlimited).
export async function restockOrderAlbums(orderItems: unknown, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<void> {
	if (!Array.isArray(orderItems) || orderItems.length === 0) return;
	const items = orderItems as { bookId?: number; quantity?: number }[];
	const bookIds = items.map((i) => i.bookId).filter((id): id is number => typeof id === 'number');
	if (bookIds.length === 0) return;
	const need = await sumNeedBySampleBook(bookIds, items as { bookId: number; quantity?: number }[], db);
	// ponytail: restock nhiều SampleBook song song thay vì tuần tự (N+1 update)
	await Promise.all(
		[...need].map(([sid, q]) =>
			db.sampleBook.updateMany({ where: { id: sid, quantity: { not: null } }, data: { quantity: { increment: q } } }),
		),
	);
}
