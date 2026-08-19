import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { CouponDTO, CreateCouponDTO, CouponMapper, ErrorCode } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';

export abstract class ICouponService {
	abstract list(): Promise<CouponDTO[]>;
	abstract create(dto: CreateCouponDTO): Promise<CouponDTO>;
	abstract remove(id: number): Promise<void>;
}

@injectable()
export class CouponService extends ICouponService {
	async list() {
		const coupons = await prisma.coupon.findMany({ where: { isDelete: false }, orderBy: { id: 'desc' } });
		return coupons.map(CouponMapper.toDTO);
	}

	async create(dto: CreateCouponDTO) {
		try {
			const coupon = await prisma.coupon.create({
				data: {
					code: dto.code.toUpperCase(),
					scope: dto.scope || 'ORDER',
					discountType: dto.discountType,
					discountValue: dto.discountValue,
					minOrderAmount: dto.minOrderAmount || 0,
					maxDiscountAmount: dto.maxDiscountAmount ?? null,
					maxUsageCount: dto.maxUsageCount || 0,
					isActive: dto.isActive ?? true,
					expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
				},
			});
			return CouponMapper.toDTO(coupon);
		} catch (e: any) {
			if (e?.code === 'P2002') {
				throw new AppError(ErrorCode.COUPON_CODE_EXISTS, 409);
			}
			throw e;
		}
	}

	async remove(id: number) {
		await prisma.coupon.update({ where: { id }, data: { isDelete: true } });
	}
}
