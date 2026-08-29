import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../lib/db.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

// ponytail: repository layer — tách toàn bộ truy cập Prisma của feature cart ra khỏi service.
// Service chỉ biết CartRepository; mỗi method nhận tx? (transaction client) để gộp chung $transaction.
const CART_INCLUDE = {
	items: { include: { book: true }, orderBy: { id: 'asc' } },
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

type PrintOptionRow = { type: string; code: string; price: number | null; width: number | null; height: number | null };

export type OptKeyMap = Map<string, { price: number | null; width: number | null; height: number | null }>;

export function toOptKeyMap(rows: PrintOptionRow[]): OptKeyMap {
	const m: OptKeyMap = new Map();
	for (const o of rows) m.set(`${o.type}:${o.code}`, o);
	return m;
}

@injectable()
export class CartRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	// ponytail: lô đọc batch (cart + options + optional coupon) gộp 1 $transaction.
	loadCartBatch(userId: number, couponCode?: string | null) {
		const wantsCoupon = !!couponCode;
		return this.client.$transaction([
			this.client.cart.findUnique({ where: { userId }, include: CART_INCLUDE }),
			this.client.printOption.findMany(OPT_ARGS),
			...(wantsCoupon ? [this.client.coupon.findFirst(couponArgs(couponCode!))] : []),
		]) as Promise<[any, PrintOptionRow[], any?]>;
	}

	createCart(userId: number) {
		return this.client.cart.create({ data: { userId }, include: CART_INCLUDE });
	}

	// ponytail: print options — dùng cả trong upsertItem (tx) và patchItem (client). Trả về OptKeyMap.
	async loadOptions(tx?: Prisma.TransactionClient) {
		return toOptKeyMap(await (tx ?? this.client).printOption.findMany(OPT_ARGS));
	}

	findCart(userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).cart.findUnique({ where: { userId }, select: { id: true } });
	}

	updateCartItem(cartId: number, bookId: number, data: Record<string, unknown>, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).cartItem.update({
			where: { cartId_bookId: { cartId, bookId } },
			data: data as Prisma.CartItemUpdateInput,
			include: { book: true },
		});
	}

	deleteCartItems(cartId: number, bookId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).cartItem.deleteMany({ where: { cartId, bookId } });
	}

	findSampleBook(sampleBookId: number, quantity: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).sampleBook.findFirst({
			where: {
				id: sampleBookId,
				isDelete: false,
				isActive: true,
				OR: [{ quantity: null }, { quantity: { gte: quantity } }],
			},
		});
	}

	findBookByUser(userId: number, sampleBookId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).book.findFirst({ where: { userId, sampleBookId } });
	}

	createBook(data: Prisma.BookUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).book.create({ data });
	}
}
