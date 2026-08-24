import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { ErrorCode, CartDTO, CartMapper, CartItem, parseCartItems, DiscountType, MinOrderType } from '@echotrace/shared';
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

function parseRawItems(cartItems: unknown): any[] {
	try {
		return Array.isArray(cartItems) ? (cartItems as any[]) : JSON.parse((cartItems as any) ?? '[]');
	} catch {
		return [];
	}
}

async function saveCart(tx: any, userId: number, items: any[]) {
	await tx.cart.upsert({
		where: { userId },
		update: { items: items as unknown as Prisma.InputJsonValue },
		create: { userId, items: items as unknown as Prisma.InputJsonValue },
	});
}

// Chỉ lấy đúng 3 dòng option cần cho 1 item.
async function loadOptionsFor(tx: any, item: { cover?: string | null; paper?: string | null; paperSize?: string | null }) {
	const conds = [
		item.cover != null && { type: 'cover', code: item.cover },
		item.paper != null && { type: 'paper', code: item.paper },
		item.paperSize != null && { type: 'paperSize', code: item.paperSize },
	].filter(Boolean);
	const rows = await tx.printOption.findMany({
		where: { isDelete: false, OR: conds },
		select: { type: true, code: true, price: true, width: true, height: true },
	});
	return toOptKeyMap(rows);
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
	abstract calculateCart(userId: number, paymentMethod?: string | null, couponCode?: string | null): Promise<CartQuote>;
}

@injectable()
export class CartService extends ICartService {
	async getCart(userId: number) {
		let cart = await prisma.cart.findUnique({ where: { userId } });
		if (!cart) {
			cart = await prisma.cart.create({ data: { userId } });
		}
		return CartMapper.toDTO(cart);
	}

	// Thêm mới hoặc ghi đè dòng theo bookId. Trùng sách → cộng dồn quantity (giữ hành vi cũ của studio).
	async upsertItem(userId: number, input: Partial<CartItem> & { bookId: number }): Promise<CartItem> {
		const priced = await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findUnique({ where: { userId } });
			const items = parseRawItems(cart?.items);
			const idx = items.findIndex((i) => i.bookId === input.bookId);
			let merged: any =
				idx >= 0
					? { ...items[idx], ...input, quantity: (items[idx].quantity || 1) + (input.quantity ?? 1) }
					: { quantity: 1, ...input };
			delete merged.price; // giá luôn do server tính
			merged = applyItemPrice(merged, await loadOptionsFor(tx, merged));
			items[idx >= 0 ? idx : items.length] = merged;
			await saveCart(tx, userId, items);
			return merged;
		});
		return parseCartItems([priced])[0];
	}

	async patchItem(
		userId: number,
		bookId: number,
		patch: Partial<Pick<CartItem, 'quantity' | 'cover' | 'paper' | 'paperSize'>>,
	): Promise<CartItem> {
		const priced = await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findUnique({ where: { userId } });
			const items = parseRawItems(cart?.items);
			const idx = items.findIndex((i) => i.bookId === bookId);
			if (idx < 0) throw new AppError(ErrorCode.NOT_FOUND, 404);
			const merged = applyItemPrice({ ...items[idx], ...patch }, await loadOptionsFor(tx, { ...items[idx], ...patch }));
			items[idx] = merged;
			await saveCart(tx, userId, items);
			return merged;
		});
		return parseCartItems([priced])[0];
	}

	async deleteItem(userId: number, bookId: number): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findUnique({ where: { userId } });
			const items = parseRawItems(cart?.items).filter((i) => i.bookId !== bookId);
			await saveCart(tx, userId, items);
		});
	}

	async calculateCart(userId: number, paymentMethod?: string | null, couponCode?: string | null): Promise<CartQuote> {
		const { Coupon, Priced } = await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findUnique({ where: { userId } });
			const coupon = await this.findCoupon(tx, couponCode);
			const options = await tx.printOption.findMany({
				where: { isDelete: false },
				select: { type: true, code: true, price: true, width: true, height: true },
			});

			const raw = parseRawItems(cart?.items);
			const priced = raw.map((item: any) => applyItemPrice(item, toOptKeyMap(options)));

			// Lưu snapshot — checkout chỉnh qty/xoá không cần recalc nữa.
			await saveCart(tx, userId, priced);

			return { Coupon: coupon, Priced: priced };
		});

		// ponytail: parseCartItems chỉ cắt content (ảnh thumb) cho hiển thị; price được giữ nguyên.
		const items = parseCartItems(Priced);

		const subtotal = items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity || 1), 0);
		const discount = this.couponDiscount(Coupon, subtotal, items);
		const total = Math.max(0, subtotal - discount);
		const payNow = total == null ? 0 : paymentMethod === 'half' ? Math.round((total * 50) / 100) : total;
		const payLater = total - payNow;
		return {
			items,
			subtotal,
			discount,
			total,
			payNow,
			payLater,
			coupon: discount > 0 && Coupon ? { code: Coupon.code, amount: discount } : null,
		};
	}

	// Coupon mới: code lưu dạng "CODE-<timestamp>" để không trùng khi tạo. Người dùng nhập CODE trần,
	// nên lookup theo prefix (fallback exact cho coupon seed cũ). Lấy bản mới nhất nếu trùng code.
	private async findCoupon(tx: any, code: string | null | undefined) {
		if (!code) return null;
		const upper = code.trim().toUpperCase();
		return tx.coupon.findFirst({
			where: { isDelete: false, OR: [{ code: upper }, { code: { startsWith: `${upper}-` } }] },
			orderBy: { id: 'desc' },
		});
	}

	// ponytail: same math as the frontend DiscountModal — keep in sync.
	private couponDiscount(coupon: any, subtotal: number, items: CartItem[]): number {
		return computeCouponDiscount(coupon, subtotal, items);
	}
}

// Pure — unit-testable without DB.
// Giá 1 quyển = (số trang − 2 trang bìa) × giá 1 trang × hệ số kích thước + giá bìa.
export function computeItemPrice(pages: number, coverPrice: number, perPagePrice: number, sizeFactor: number): number {
	const innerPages = Math.max(0, pages - 2);
	return Math.ceil((innerPages * perPagePrice * sizeFactor + coverPrice) / 1000) * 1000;
}

// Pure — unit-testable without DB.
export function computeCouponDiscount(coupon: any, subtotal: number, items: CartItem[]): number {
	if (!coupon) return 0;
	if (!coupon.isActive) return 0;
	if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return 0;
	if (coupon.maxUsageCount > 0 && (coupon.usedCount ?? 0) >= coupon.maxUsageCount) return 0;
	// minOrderType: VALUE = theo giá (subtotal), QUANTITY = theo số quyển.
	const orderQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
	const meetsMin =
		(coupon.minOrderType || 'VALUE').toLowerCase() === MinOrderType.QUANTITY
			? orderQty >= (coupon.minOrderAmount ?? 0)
			: subtotal >= (coupon.minOrderAmount ?? 0);
	if (!meetsMin) return 0;
	const type = (coupon.discountType || '').toLowerCase();
	const raw = type === DiscountType.PERCENTAGE ? (subtotal * (coupon.discountValue ?? 0)) / 100 : coupon.discountValue ?? 0;
	// maxDiscountAmount = 0/null = không giới hạn.
	const capped = coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw;
	return Math.max(0, capped);
}
