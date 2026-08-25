import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { ErrorCode, CartDTO, CartItem, composeCartItem, computeCouponDiscount } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';

export interface CartQuote {
	items: CartItem[];
	subtotal: number;
	discount: number;
	total: number;
	payNow: number;
	payLater: number;
	coupon: { code: string; amount: number } | null;
}

type OptRow = { price: number | null; width: number | null; height: number | null };
type OptKeyMap = Map<string, OptRow>;

function applyItemPrice(item: any, optByKey: OptKeyMap): any {
	if (item.cover == null || item.paper == null || item.paperSize == null) return { ...item, price: null };
	const cover = optByKey.get(`cover:${item.cover}`)?.price;
	const paper = optByKey.get(`paper:${item.paper}`)?.price;
	const size = optByKey.get(`paperSize:${item.paperSize}`);
	if (cover == null || paper == null) return { ...item, price: null };
	// ponytail: hệ số kích thước = paperSize.price nếu admin đặt, fallback diện tích so A4.
	const factor = size?.price ?? (size?.width && size?.height ? (size.width * size.height) / (210 * 297) : 1);
	return { ...item, price: computeItemPrice(item.pages ?? 0, cover, paper, factor) };
}

function toOptKeyMap(rows: { type: string; code: string; price: number | null; width: number | null; height: number | null }[]): OptKeyMap {
	const m: OptKeyMap = new Map();
	for (const o of rows) m.set(`${o.type}:${o.code}`, o);
	return m;
}

// ponytail: giá tính fresh mỗi lần đọc (không còn snapshot trong JSON) — thêm cache khi đo được chậm.
async function loadAllOptions(db: any): Promise<OptKeyMap> {
	const rows = await db.printOption.findMany({
		where: { isDelete: false },
		select: { type: true, code: true, price: true, width: true, height: true },
	});
	return toOptKeyMap(rows);
}

const CART_INCLUDE = { items: { include: { book: true }, orderBy: { id: 'asc' } } };

async function getOrCreateCart(db: any, userId: number) {
	let cart = await db.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
	if (!cart) {
		cart = await db.cart.create({ data: { userId }, include: CART_INCLUDE });
	}
	return cart;
}

export abstract class ICartService {
	abstract getCart(userId: number): Promise<CartDTO>;
	abstract upsertItem(userId: number, input: Partial<CartItem> & { bookId: number }): Promise<CartItem>;
	abstract patchItem(
		userId: number,
		bookId: number,
		patch: Partial<Pick<CartItem, 'quantity' | 'cover' | 'paper' | 'paperSize'>>,
	): Promise<CartItem>;
	abstract deleteItem(userId: number, bookId: number): Promise<void>;
	abstract calculateCart(
		userId: number,
		paymentMethod?: string | null,
		couponCode?: string | null,
		bookIds?: number[] | null,
	): Promise<CartQuote>;
}

@injectable()
export class CartService extends ICartService {
	private async pricedDTO(userId: number): Promise<CartDTO> {
		const cart = await getOrCreateCart(prisma, userId);
		const optMap = cart.items.length ? await loadAllOptions(prisma) : new Map();
		const parsedItems = cart.items.map((row: any) => applyItemPrice(composeCartItem(row, row.book), optMap));
		return {
			id: cart.id,
			userId: cart.userId,
			items: parsedItems.length ? parsedItems : null,
			parsedItems,
			createdAt: cart.createdAt,
			updatedAt: cart.updatedAt,
		};
	}

	async getCart(userId: number) {
		return this.pricedDTO(userId);
	}

	async upsertItem(userId: number, input: Partial<CartItem> & { bookId: number }): Promise<CartItem> {
		return prisma.$transaction(async (tx) => {
			const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
			const book = await tx.book.findFirst({ where: { id: input.bookId, userId, isDelete: false }, select: { id: true } });
			if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);

			const key = { cartId_bookId: { cartId: cart.id, bookId: input.bookId } };
			const existing = await tx.cartItem.findUnique({ where: key });
			const row = await tx.cartItem.upsert({
				where: key,
				update: {
					quantity: Math.max(1, (existing?.quantity ?? 0) + (input.quantity ?? 1)),
					cover: input.cover ?? existing?.cover ?? null,
					paper: input.paper ?? existing?.paper ?? null,
					paperSize: input.paperSize ?? existing?.paperSize ?? null,
				},
				create: {
					cartId: cart.id,
					bookId: input.bookId,
					quantity: Math.max(1, input.quantity ?? 1),
					cover: input.cover ?? null,
					paper: input.paper ?? null,
					paperSize: input.paperSize ?? null,
				},
				include: { book: true },
			});
			return applyItemPrice(composeCartItem(row, row.book), await loadAllOptions(tx));
		});
	}

	async patchItem(
		userId: number,
		bookId: number,
		patch: Partial<Pick<CartItem, 'quantity' | 'cover' | 'paper' | 'paperSize'>>,
	): Promise<CartItem> {
		const row = await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findUnique({ where: { userId }, select: { id: true } });
			if (!cart) throw new AppError(ErrorCode.NOT_FOUND, 404);
			const key = { cartId_bookId: { cartId: cart.id, bookId } };
			if (Object.keys(patch).length) {
				const updated = await tx.cartItem.updateMany({
					where: { cartId: cart.id, bookId },
					data: { ...patch, ...(patch.quantity != null ? { quantity: Math.max(1, patch.quantity) } : {}) },
				});
				if (!updated.count) throw new AppError(ErrorCode.NOT_FOUND, 404);
			}
			return tx.cartItem.findUnique({ where: key, include: { book: true } });
		});
		if (!row) throw new AppError(ErrorCode.NOT_FOUND, 404);
		return applyItemPrice(composeCartItem(row, row.book), await loadAllOptions(prisma));
	}

	async deleteItem(userId: number, bookId: number): Promise<void> {
		const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
		if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id, bookId } });
	}

	async calculateCart(
		userId: number,
		paymentMethod?: string | null,
		couponCode?: string | null,
		bookIds?: number[] | null,
	): Promise<CartQuote> {
		const cart = await getOrCreateCart(prisma, userId);
		const Coupon = await this.findCoupon(prisma, couponCode);
		const optMap = cart.items.length ? await loadAllOptions(prisma) : new Map();
		const ids = Array.isArray(bookIds) && bookIds.length ? new Set(bookIds) : null;
		const items: CartItem[] = cart.items
			.filter((row: any) => !ids || ids.has(row.bookId))
			.map((row: any) => applyItemPrice(composeCartItem(row, row.book), optMap));
		const incomplete = items.find((i) => i.price == null);
		if (incomplete) {
			throw new AppError(ErrorCode.MISSING_BOOK_OPTIONS, 400, { bookId: incomplete.bookId, title: incomplete.title });
		}

		const subtotal = items.reduce((s: number, i) => s + (i.price ?? 0) * (i.quantity || 1), 0);
		const discount = computeCouponDiscount(Coupon, subtotal, items);		const total = Math.max(0, subtotal - discount);
		const payNow = total == null ? 0 : paymentMethod === 'half' ? Math.round((total * 50) / 100) : total;
		const payLater = total - payNow;
		return {
			items,
			subtotal,
			discount,
			total,
			payNow,
			payLater,
			coupon: discount > 0 && Coupon ? { ...Coupon, amount: discount } : null,
		};
	}

	private async findCoupon(tx: any, code: string | null | undefined) {
		if (!code) return null;
		const upper = code.trim().toUpperCase();
		return tx.coupon.findFirst({
			where: { isDelete: false, OR: [{ code: upper }, { code: { startsWith: `${upper}-` } }] },
			orderBy: { id: 'desc' },
		});
	}
}

export function computeItemPrice(pages: number, coverPrice: number, perPagePrice: number, sizeFactor: number): number {
	const innerPages = Math.max(0, pages - 2);
	return Math.ceil((innerPages * perPagePrice * sizeFactor + coverPrice) / 1000) * 1000;
}
