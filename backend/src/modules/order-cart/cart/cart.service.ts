import { inject, injectable } from 'tsyringe';
import { Prisma } from '../../../../generated/prisma/client.js';
import { ErrorCode, CartDTO, CartItem, composeCartItem, computeCouponDiscount, PaymentPlan } from '@echotrace/shared';
import { AppError } from '../../../shared/middleware/app.error.js';
import { CartRepository } from './cart.repository.js';
import type { IPrintOptionService, PrintOptionRawRow } from '../../product/print-options/print-options.service.js';
import type { ICouponService } from '../coupons/coupons.service.js';
import type { ISampleBookService } from '../../product/sample-books/sample-books.service.js';

export interface CartQuote {
	items: CartItem[];
	subtotal: number;
	discount: number;
	total: number;
	payNow: number;
	payLater: number;
	// id and maxUsageCount are included (spread from the full DB row) so OrderService
	// can atomically increment usedCount inside the order creation transaction.
	coupon: { id: number; code: string; amount: number; maxUsageCount: number } | null;
}

type OptKeyMap = Map<string, { price: number | null; width: number | null; height: number | null }>;

function toOptKeyMap(rows: PrintOptionRawRow[]): OptKeyMap {
	const m: OptKeyMap = new Map();
	for (const o of rows) m.set(`${o.type}:${o.code}`, o);
	return m;
}

function applyItemPrice(item: any, optByKey: OptKeyMap): any {
	if (item.cover == null || item.paper == null || item.paperSize == null) return { ...item, price: null };
	const cover = optByKey.get(`cover:${item.cover}`)?.price;
	const paper = optByKey.get(`paper:${item.paper}`)?.price;
	const size = optByKey.get(`paperSize:${item.paperSize}`);
	if (cover == null || paper == null) return { ...item, price: null };
	// ponytail: paperSize multiplier is ALWAYS derived from dimensions (A4-area ratio).
	// The admin price field on paperSize rows is ignored — it's not a cost, it used to be
	// a hidden override that silently beat the dimension math.
	const factor = size?.width && size?.height ? (size.width * size.height) / (210 * 297) : 1;
	return { ...item, price: computeItemPrice(item.pages ?? 0, cover, paper, factor) };
}

export interface ICartService {
	getCart(userId: number): Promise<CartDTO>;
	upsertItem(userId: number, input: Partial<CartItem> & { bookId: number }): Promise<CartItem>;
	patchItem(
		userId: number,
		bookId: number,
		patch: Partial<Pick<CartItem, 'quantity' | 'cover' | 'paper' | 'paperSize'>>,
	): Promise<CartItem>;
	deleteItem(userId: number, bookId: number): Promise<void>;
	addAlbumToCart(userId: number, input: { sampleBookId: number; quantity?: number }): Promise<CartItem>;
	calculateCart(
		userId: number,
		paymentMethod?: string | null,
		couponCode?: string | null,
		bookIds?: number[] | null,
	): Promise<CartQuote>;
}

@injectable()
export class CartService implements ICartService {
	constructor(
		@inject('CartRepository') private cartRepo: CartRepository,
		@inject('IPrintOptionService') private printOptionService: IPrintOptionService,
		@inject('ICouponService') private couponService: ICouponService,
		@inject('ISampleBookService') private sampleBookService: ISampleBookService,
	) {}

	async getCart(userId: number): Promise<CartDTO> {
		const [cart, optRows] = await Promise.all([
			this.cartRepo.getCartWithItems(userId),
			this.printOptionService.listRaw(),
		]);
		const optMap = toOptKeyMap(optRows);
		const resolved = cart ?? (await this.cartRepo.createCart(userId));
		const parsedItems = resolved.items.map((row: any) => applyItemPrice(composeCartItem(row, row.book), optMap));
		return {
			id: resolved.id,
			userId,
			parsedItems,
			createdAt: resolved.createdAt,
			updatedAt: resolved.updatedAt,
		};
	}

	async upsertItem(userId: number, input: Partial<CartItem> & { bookId: number }): Promise<CartItem> {
		return this.cartRepo.client.$transaction(async (tx) => {
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
			const optMap = toOptKeyMap(await this.printOptionService.listRaw(tx));
			return applyItemPrice(composeCartItem(row, row.book), optMap);
		});
	}

	async patchItem(
		userId: number,
		bookId: number,
		patch: Partial<Pick<CartItem, 'quantity' | 'cover' | 'paper' | 'paperSize'>>,
	): Promise<CartItem> {
		const cart = await this.cartRepo.findCart(userId);
		if (!cart) throw new AppError(ErrorCode.NOT_FOUND, 404);
		try {
			const [row, optMap] = await Promise.all([
				this.cartRepo.updateCartItem(cart.id, bookId, {
					...patch,
					...(patch.quantity != null ? { quantity: Math.max(1, patch.quantity) } : {}),
				}),
				this.printOptionService.listRaw().then(toOptKeyMap),
			]);
			return applyItemPrice(composeCartItem(row, row.book), optMap);
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new AppError(ErrorCode.NOT_FOUND, 404);
			throw e;
		}
	}

	async deleteItem(userId: number, bookId: number): Promise<void> {
		const cart = await this.cartRepo.findCart(userId);
		if (cart) await this.cartRepo.deleteCartItems(cart.id, bookId);
	}

	async addAlbumToCart(userId: number, input: { sampleBookId: number; quantity?: number }): Promise<CartItem> {
		const sampleBookId = input.sampleBookId;
		const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
		if (!Number.isFinite(sampleBookId)) throw new AppError('sampleBookId không hợp lệ', 400);

		// ponytail: bypass DTO cache — need raw row (cover, style, font, content, etc.) and stock check.
		const sample = await this.sampleBookService.getByIdForStock(sampleBookId, quantity);
		if (!sample) throw new AppError('Album đã hết hàng hoặc không đủ số lượng tồn kho', 400);

		let book = await this.cartRepo.findBookByUser(userId, sampleBookId);
		if (!book) {
			book = await this.cartRepo.createBook({
				userId,
				sampleBookId,
				type: sample.type,
				title: sample.name,
				style: sample.style,
				font: sample.font,
				cover: sample.cover,
				coverUrl: sample.coverUrl,
				paperHeight: sample.paperHeight,
				paperWidth: sample.paperWidth,
				content: (sample.content as object) ?? {},
			});
		}
		return this.upsertItem(userId, { bookId: book.id, quantity, cover: sample.cover, paper: null, paperSize: null });
	}

	async calculateCart(
		userId: number,
		paymentMethod?: string | null,
		couponCode?: string | null,
		bookIds?: number[] | null,
	): Promise<CartQuote> {
		// ponytail: fetch cart, options, and optional coupon in parallel — no batch transaction needed
		// because these are all independent reads and none mutates state.
		const [cart, optRows, coupon] = await Promise.all([
			this.cartRepo.getCartWithItems(userId),
			this.printOptionService.listRaw(),
			couponCode ? this.couponService.getByCode(couponCode) : Promise.resolve(null),
		]);

		const optMap = toOptKeyMap(optRows);
		const resolved = cart ?? (await this.cartRepo.createCart(userId));

		const ids = Array.isArray(bookIds) && bookIds.length ? new Set(bookIds) : null;
		const items: CartItem[] = (resolved?.items ?? [])
			.filter((row: any) => !ids || ids.has(row.bookId))
			.map((row: any) => applyItemPrice(composeCartItem(row, row.book), optMap));

		const incomplete = items.find((i) => i.price == null);
		if (incomplete) throw new AppError(ErrorCode.MISSING_BOOK_OPTIONS, 400, { bookId: incomplete.bookId, title: incomplete.title });

		const subtotal = items.reduce((s: number, i) => s + (i.price ?? 0) * (i.quantity || 1), 0);
		const discount = computeCouponDiscount(coupon, subtotal, items);
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
			coupon: discount > 0 && coupon ? { ...coupon, amount: discount } : null,
		};
	}
}

export function computeItemPrice(pages: number, coverPrice: number, perPagePrice: number, sizeFactor: number): number {
	const innerPages = Math.max(0, pages - 2);
	return Math.ceil((innerPages * perPagePrice * sizeFactor + coverPrice) / 1000) * 1000;
}
