import { inject, injectable } from 'tsyringe';
import { CouponDTO, CreateCouponDTO, CouponMapper, ErrorCode } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { CouponRepository } from './coupons.repository.js';

export interface ICouponService {
	list(): Promise<CouponDTO[]>;
	create(dto: CreateCouponDTO): Promise<CouponDTO>;
	deactivate(id: number): Promise<void>;
	remove(id: number): Promise<void>;
}

@injectable()
export class CouponService implements ICouponService {
	constructor(@inject('CouponRepository') private couponRepo: CouponRepository) {}

	async list() {
		const coupons = await this.couponRepo.listCoupons();
		return coupons.map(CouponMapper.toDTO);
	}

	async create(dto: CreateCouponDTO) {
		const type = (dto.discountType || '').toUpperCase();
		if (type === 'FIXED' && dto.maxDiscountAmount) {
			throw new AppError(ErrorCode.VALIDATION_FAILED, 400);
		}
		try {
			const coupon = await this.couponRepo.createCoupon({
				code: `${dto.code.toUpperCase()}-${Date.now()}`,
				discountType: type,
				discountValue: dto.discountValue,
				minOrderAmount: dto.minOrderAmount || 0,
				minOrderType: (dto.minOrderType || 'VALUE').toUpperCase(),
				maxDiscountAmount: dto.maxDiscountAmount ?? null,
				maxUsageCount: dto.maxUsageCount || 0,
				isActive: dto.isActive ?? true,
				expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
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
		await this.couponRepo.deactivateCoupon(id);
	}

	async remove(id: number) {
		await this.couponRepo.removeCoupon(id);
	}
}
