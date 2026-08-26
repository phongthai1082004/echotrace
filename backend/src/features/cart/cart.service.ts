import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { ErrorCode, CartDTO, CartItem, composeCartItem, computeCouponDiscount, PaymentPlan } from '@echotrace/shared';
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

type OptKeyMap = Map<string, { price: number | null; width: number | null; height: number | null }>;

function applyItemPrice(item: any, optByKey: OptKeyMap): any {
	if (item.cover == null || item.paper == null || item.paperSize == null) return { ...item, price: null };
	const cover = optByKey.get(`cover:${item.cover}`)?.price;
	const paper = optByKey.get(`paper:${item.paper}`)?.price;
	const size = optByKey.get(`paperSize:${item.paperSize}`);
	if (cover == null || paper == null) return { ...item, price: null };
	const factor = size?.price ?? (size?.width && size?.height ? (size.width * size.height) / (210 * 297) : 1);
	return { ...item, price: computeItemPrice(item.pages ?? 0, cover, paper, factor) };
}

function toOptKeyMap(rows: { type: string; code: string; price: number | null; width: number | null; height: number | null }[]): OptKeyMap {
	const m: OptKeyMap = new Map();
	for (const o of rows) m.set(`${o.type}:${o.code}`, o);
	return m;
}

const CART_INCLUDE = {
	items: { include: 
		{ book: true }, 
		orderBy: { id: 'asc' } 
	},
} satisfies Prisma.CartInclude;

const OPT_ARGS = {
	where: { isDelete: false },
	select: { type: true, code: true, price: true, width: true, height: true },
} satisfies Prisma.PrintOptionFindManyArgs;

function couponArgs(code: string) {
	const upper = code.trim().toUpperCase();
	return {
		where: { isDelete: false, OR: [{ code: upper }, { code: { startsWith: `${upper}-` } }] },
		orderBy: { id: 'desc' },
	} satisfies Prisma.CouponFindFirstArgs;
}

async function loadOptions(db: any): Promise<OptKeyMap> {
	return toOptKeyMap(await db.printOption.findMany(OPT_ARGS));
}

async function loadCartBatch(userId: number, couponCode?: string | null) {
	const wantsCoupon = !!couponCode;
	const [cart, optionRows, Coupon] = await prisma.$transaction([
		prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE }),
		prisma.printOption.findMany(OPT_ARGS),
		...(wantsCoupon ? [prisma.coupon.findFirst(couponArgs(couponCode!))] : []),
	]);
	if (!cart) {
		const created = await prisma.cart.create({ data: { userId }, include: CART_INCLUDE });
		return { cart: created, optMap: toOptKeyMap(optionRows), Coupon: null };
	}
	return { cart, optMap: toOptKeyMap(optionRows), Coupon: wantsCoupon ? (Coupon as any) : null };
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
	async getCart(userId: number): Promise<CartDTO> {
		const { cart, optMap } = await loadCartBatch(userId);
		const parsedItems = cart.items.map((row: any) => applyItemPrice(composeCartItem(row, row.book), optMap));
		return {
			id: cart.id,
			userId,
			parsedItems,
			createdAt: cart.createdAt,
			updatedAt: cart.updatedAt,
		};
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
			return applyItemPrice(composeCartItem(row, row.book), await loadOptions(tx));
		});
	}

	async patchItem(
		userId: number,
		bookId: number,
		patch: Partial<Pick<CartItem, 'quantity' | 'cover' | 'paper' | 'paperSize'>>,
	): Promise<CartItem> {
		const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
		if (!cart) throw new AppError(ErrorCode.NOT_FOUND, 404);
		try {
			const row = await prisma.cartItem.update({
				where: { cartId_bookId: { cartId: cart.id, bookId } },
				data: { ...patch, ...(patch.quantity != null ? { quantity: Math.max(1, patch.quantity) } : {}) },
				include: { book: true },
			});
			return applyItemPrice(composeCartItem(row, row.book), await loadOptions(prisma));
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new AppError(ErrorCode.NOT_FOUND, 404);
			throw e;
		}
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
		const { cart, optMap, Coupon } = await loadCartBatch(userId, couponCode);

		const ids = Array.isArray(bookIds) && bookIds.length ? new Set(bookIds) : null;
		const items: CartItem[] = (cart?.items ?? [])
			.filter((row: any) => !ids || ids.has(row.bookId))
			.map((row: any) => applyItemPrice(composeCartItem(row, row.book), optMap));
		const incomplete = items.find((i) => i.price == null);
		if (incomplete) throw new AppError(ErrorCode.MISSING_BOOK_OPTIONS, 400, { bookId: incomplete.bookId, title: incomplete.title });

		const subtotal = items.reduce((s: number, i) => s + (i.price ?? 0) * (i.quantity || 1), 0);
		const discount = computeCouponDiscount(Coupon, subtotal, items);
		const total = Math.max(0, subtotal - discount);
		const payNow = paymentMethod === PaymentPlan.HALF ? Math.round((total * 50) / 100) : total;
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
}

export function computeItemPrice(pages: number, coverPrice: number, perPagePrice: number, sizeFactor: number): number {
	const innerPages = Math.max(0, pages - 2);
	return Math.ceil((innerPages * perPagePrice * sizeFactor + coverPrice) / 1000) * 1000;
}
