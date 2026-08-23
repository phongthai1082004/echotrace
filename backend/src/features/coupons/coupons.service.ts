import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { CouponDTO, CreateCouponDTO, CouponMapper, ErrorCode } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';

export abstract class ICouponService {
	abstract list(): Promise<CouponDTO[]>;
	abstract create(dto: CreateCouponDTO): Promise<CouponDTO>;
	abstract deactivate(id: number): Promise<void>;
	abstract remove(id: number): Promise<void>;
}

@injectable()
export class CouponService extends ICouponService {
	async list() {
		const coupons = await prisma.coupon.findMany({ where: { isDelete: false }, orderBy: { id: 'desc' } });
		return coupons.map(CouponMapper.toDTO);
	}

	async create(dto: CreateCouponDTO) {
		// Giảm trên toàn đơn (bỏ scope). Code = tên + unix timestamp để không trùng.
		const type = (dto.discountType || '').toUpperCase();
		if (type === 'FIXED' && dto.maxDiscountAmount) {
			throw new AppError(ErrorCode.VALIDATION_FAILED, 400);
		}
		try {
			const coupon = await prisma.coupon.create({
				data: {
					code: `${dto.code.toUpperCase()}-${Date.now()}`,
					discountType: type,
					discountValue: dto.discountValue,
					minOrderAmount: dto.minOrderAmount || 0,
					minOrderType: (dto.minOrderType || 'VALUE').toUpperCase(),
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

	// ponytail: inactive là một chiều — không có đường reactivate.
	async deactivate(id: number) {
		await prisma.coupon.update({ where: { id }, data: { isActive: false } });
	}

	async remove(id: number) {
		await prisma.coupon.update({ where: { id }, data: { isDelete: true } });
	}
}
