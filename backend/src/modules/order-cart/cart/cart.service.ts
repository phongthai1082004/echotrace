import { inject, injectable } from 'tsyringe';
import { Prisma } from '../../../../generated/prisma/client.js';
import { ErrorCode, CartDTO, CartItem, composeCartItem, computeCouponDiscount, PaymentPlan } from '@echotrace/shared';
import { AppError } from '../../../shared/middleware/app.error.js';
import { CartRepository, BOOK_SELECT } from './cart.repository.js';
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

function clampQty(v: unknown): number {
	const n = Math.floor(Number(v));
	return Number.isFinite(n) ? Math.min(999, Math.max(1, n)) : 1;
}

function applyItemPrice(item: any, optByKey: OptKeyMap): any {
	if (item.cover == null || item.paper == null) return { ...item, price: null };
	const cover = optByKey.get(`cover:${item.cover}`)?.price;
	const paper = optByKey.get(`paper:${item.paper}`)?.price;
	if (cover == null || paper == null) return { ...item, price: null };
	// The admin price field on paperSize rows is ignored �?" it's not a cost, it used to be
	// a hidden override that silently beat the dimension math.
	// Album items have no paperSize code (size cố định từ lúc tạo album) → lấy từ
	// dims của sách; không có dims mới chịu 400 như cũ.
	const size = item.paperSize == null ? null : optByKey.get(`paperSize:${item.paperSize}`);
	let factor: number | null;
	if (size?.width && size?.height) factor = (size.width * size.height) / (210 * 297);
	else if (item.paperSize != null) factor = 1;
	else if (item.paperWidth && item.paperHeight) factor = (item.paperWidth * item.paperHeight) / (210 * 297);
	else factor = null;
	if (factor == null) return { ...item, price: null };
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
	addAlbumToCart(userId: number, input: { sampleBookId: number; quantity?: number; cover?: string | null; paper?: string | null }): Promise<CartItem>;
	calculateCart(
		userId: number,
		paymentMethod?: string | null,
		couponCode?: string | null,
		bookIds?: number[] | null,
	): Promise<CartQuote>;
}

@injectable()
export class CartService implements ICartService {	constructor(
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
		return this.cartRepo.client.$transaction(async (tx) => this.upsertItemTx(tx, userId, input));
	}

	private async upsertItemTx(
		tx: Prisma.TransactionClient,
		userId: number,
		input: Partial<CartItem> & { bookId: number },
	): Promise<CartItem> {
		const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
		const book = await tx.book.findFirst({ where: { id: input.bookId, userId, isDelete: false }, select: { id: true } });
		if (!book) throw new AppError(ErrorCode.NOT_FOUND, 404);

		const key = { cartId_bookId: { cartId: cart.id, bookId: input.bookId } };
		const existing = await tx.cartItem.findUnique({ where: key });
		const row = await tx.cartItem.upsert({
			where: key,
			update: {
				quantity: clampQty((existing?.quantity ?? 0) + (input.quantity ?? 1)),
				cover: input.cover ?? existing?.cover ?? null,
				paper: input.paper ?? existing?.paper ?? null,
				paperSize: input.paperSize ?? existing?.paperSize ?? null,
			},
			create: {
				cartId: cart.id,
				bookId: input.bookId,
				quantity: clampQty(input.quantity ?? 1),
				cover: input.cover ?? null,
				paper: input.paper ?? null,
				paperSize: input.paperSize ?? null,
			},
			include: { book: { select: BOOK_SELECT } },
		});
		const optMap = toOptKeyMap(await this.printOptionService.listRaw(tx));
		return applyItemPrice(composeCartItem(row, row.book), optMap);
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
					...(patch.quantity != null ? { quantity: clampQty(patch.quantity) } : {}),
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

	async addAlbumToCart(userId: number, input: { sampleBookId: number; quantity?: number; cover?: string | null; paper?: string | null }): Promise<CartItem> {
		const sampleBookId = input.sampleBookId;
		const quantity = clampQty(input.quantity ?? 1);
		if (!Number.isFinite(sampleBookId)) throw new AppError('sampleBookId không hợp lệ', 400);

		const sample = await this.sampleBookService.getByIdForStock(sampleBookId, quantity);
		if (!sample) throw new AppError('Album đã hết hàng hoặc không đủ số lượng tồn kho', 400);

		// upsert nguyên tử trên unique (userId, sampleBookId): 2 request cùng lúc
		// cũng chỉ ra 1 Book (DB chặn trùng, khỏi race find-or-create).
		return this.cartRepo.client.$transaction(async (tx) => {
			const book = await tx.book.upsert({
				where: { userId_sampleBookId: { userId, sampleBookId } },
				update: {},
				create: {
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
				},
			});
			// cover rớt về sample.cover, paper bắt buộc (thiếu → 400 ở calculateCart).
			return this.upsertItemTx(tx, userId, { bookId: book.id, quantity, cover: input.cover ?? sample.cover, paper: input.paper ?? null, paperSize: null });
		});
	}

	async calculateCart(
		userId: number,
		paymentMethod?: string | null,
		couponCode?: string | null,
		bookIds?: number[] | null,
	): Promise<CartQuote> {
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
