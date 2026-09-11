import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

// ponytail: repository layer — tách toàn bộ truy cập Prisma của feature cart ra khỏi service.
// Service chỉ biết CartRepository; mỗi method nhận tx? (transaction client) để gộp chung $transaction.
const CART_INCLUDE = {
	items: { include: { book: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.CartInclude;

@injectable()
export class CartRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	// ponytail: fetch cart with all items+books in one query; used by getCart and calculateCart.
	getCartWithItems(userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).cart.findUnique({ where: { userId }, include: CART_INCLUDE });
	}

	createCart(userId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).cart.create({ data: { userId }, include: CART_INCLUDE });
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

	findBookByUser(userId: number, sampleBookId: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).book.findFirst({ where: { userId, sampleBookId } });
	}

	createBook(data: Prisma.BookUncheckedCreateInput, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).book.create({ data });
	}
}
