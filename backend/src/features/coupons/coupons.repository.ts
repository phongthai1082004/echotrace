import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../lib/db.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

// ponytail: repository layer — tách toàn bộ truy cập Prisma của feature coupons ra khỏi service.
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
}
