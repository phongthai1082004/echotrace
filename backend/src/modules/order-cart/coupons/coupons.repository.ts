import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

// Service chỉ biết CouponRepository; mỗi method nhận tx? (transaction client) để gộp chung $transaction.
@injectable()
export class CouponRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	listCoupons() {
		return this.client.coupon.findMany({ where: { isDelete: false }, orderBy: { id: 'desc' } });
	}

	createCoupon(data: Prisma.CouponUncheckedCreateInput) {
		return this.client.coupon.create({ data });
	}

	deactivateCoupon(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).coupon.update({ where: { id }, data: { isActive: false } });
	}

	removeCoupon(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).coupon.update({ where: { id }, data: { isDelete: true } });
	}

	findByCode(code: string, tx?: Prisma.TransactionClient) {
		const upper = code.trim().toUpperCase();
		return (tx ?? this.client).coupon.findFirst({
			where: {
				isDelete: false,
				OR: [{ code: upper }, { code: { startsWith: `${upper}-` } }],
			},
			orderBy: { id: 'desc' },
		});
	}

	// is always consistent with the order row. Condition maxUsageCount > 0 is checked by
	// the caller; this method always increments (no guard here to keep it simple).
	incrementUsedCount(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).coupon.update({
			where: { id },
			data: { usedCount: { increment: 1 } },
		});
	}

	// isolation — prevents two concurrent orders from both passing the usedCount check that
	// happened outside the transaction in calculateCart.
	findByIdInTx(id: number, tx: Prisma.TransactionClient) {
		return tx.coupon.findUnique({
			where: { id },
			select: { id: true, usedCount: true, maxUsageCount: true, isActive: true, expiresAt: true },
		});
	}
}
