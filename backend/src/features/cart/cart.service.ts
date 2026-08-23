import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { CartDTO, UpdateCartDTO, CartMapper, CartItem, parseCartItems, DiscountType, MinOrderType } from '@echotrace/shared';

export interface CartQuote {
	items: CartItem[];
	subtotal: number;
	discount: number;
	total: number;
	payNow: number;
	payLater: number;
	coupon: { code: string; amount: number } | null;
}

export abstract class ICartService {
	abstract getCart(userId: number): Promise<CartDTO>;
	abstract updateCart(userId: number, dto: UpdateCartDTO): Promise<CartDTO>;
	abstract calculateCart(
		userId: number,
		paymentMethod?: string | null,
		couponCode?: string | null,
	): Promise<CartQuote>;
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

	async updateCart(userId: number, dto: UpdateCartDTO) {
		const items = dto.items as unknown as Prisma.InputJsonValue;
		const cart = await prisma.cart.upsert({
			where: { userId },
			update: { items },
			create: { userId, items },
		});
		return CartMapper.toDTO(cart);
	}

	async calculateCart(userId: number, paymentMethod?: string | null, couponCode?: string | null): Promise<CartQuote> {
		// ponytail: một transaction: đọc cart + coupon + catalog, tính giá, lưu snapshot giá vào cart.
		const { Coupon, Priced } = await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findUnique({ where: { userId } });
			const coupon = await this.findCoupon(tx, couponCode);
			const options = await tx.printOption.findMany({ where: { isDelete: false } });

			const priceByKey = new Map<string, number>();
			for (const o of options) if (o.price != null) priceByKey.set(`${o.type}:${o.code}`, o.price);

			let raw: any[] = [];
			try {
				raw = Array.isArray(cart?.items) ? (cart.items as any[]) : JSON.parse((cart?.items as any) ?? "[]");
			} catch {}

			// ponytail: bỏ qua item chưa chọn đủ cover/paper/paperSize — chưa định giá được.
			const priced = raw.map((item: any) => {
				if (item.cover == null || item.paper == null || item.paperSize == null) return { ...item, price: null };
				const cover = priceByKey.get(`cover:${item.cover}`);
				const paper = priceByKey.get(`paper:${item.paper}`);
				if (cover != null || paper != null) return { ...item, price: (cover ?? 0) + (paper ?? 0) };
				return { ...item, price: item.price && item.price > 0 ? item.price : null };
			});

			// Lưu snapshot — checkout chỉnh qty/xoá không cần recalc nữa.
			await tx.cart.upsert({
				where: { userId },
				update: { items: priced as unknown as Prisma.InputJsonValue },
				create: { userId, items: priced as unknown as Prisma.InputJsonValue },
			});

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
