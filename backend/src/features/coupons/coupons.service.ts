import { inject, injectable } from 'tsyringe';
import { CouponDTO, CreateCouponDTO, CouponMapper, ErrorCode } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { CouponRepository } from './coupons.repository.js';
import { Prisma } from '../../../generated/prisma/client.js';

// Re-export the Prisma Coupon shape that callers (e.g. CartService) need for coupon discount logic.
export type CouponRow = Awaited<ReturnType<CouponRepository['findByCode']>>;

export interface ICouponService {
	list(): Promise<CouponDTO[]>;
	create(dto: CreateCouponDTO): Promise<CouponDTO>;
	deactivate(id: number): Promise<void>;
	remove(id: number): Promise<void>;
	/** Look up an active coupon by its user-facing code; returns null if not found or inactive. */
	getByCode(code: string, tx?: Prisma.TransactionClient): Promise<CouponRow>;
	/**
	 * Increment usedCount for the coupon with the given id.
	 * Must be called inside the order creation transaction so usage stays consistent.
	 * No-op when maxUsageCount === 0 (unlimited coupon).
	 */
	incrementCouponUsage(couponId: number, maxUsageCount: number, tx: Prisma.TransactionClient): Promise<void>;
	/**
	 * Re-reads the coupon inside tx, validates it is still active/not expired/not over limit,
	 * then atomically increments usedCount. Throws 400 if the coupon is no longer valid.
	 * Use this inside the order creation transaction to close the race between calculateCart
	 * (which reads usedCount outside the tx) and concurrent orders.
	 */
	validateAndIncrementCoupon(couponId: number, tx: Prisma.TransactionClient): Promise<void>;
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

	async getByCode(code: string, tx?: Prisma.TransactionClient): Promise<CouponRow> {
		return this.couponRepo.findByCode(code, tx);
	}

	async incrementCouponUsage(couponId: number, maxUsageCount: number, tx: Prisma.TransactionClient): Promise<void> {
		// maxUsageCount === 0 means unlimited; no tracking needed.
		if (maxUsageCount === 0) return;
		await this.couponRepo.incrementUsedCount(couponId, tx);
	}

	async validateAndIncrementCoupon(couponId: number, tx: Prisma.TransactionClient): Promise<void> {
		// ponytail: re-read inside the Serializable transaction so concurrent orders see
		// each other's increments. Without this, two orders using the same maxUsageCount=1
		// coupon would both read usedCount=0 in calculateCart and both pass.
		const coupon = await this.couponRepo.findByIdInTx(couponId, tx);
		if (!coupon || !coupon.isActive) throw new AppError(ErrorCode.COUPON_CODE_EXISTS, 400);
		if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
			throw new AppError(ErrorCode.COUPON_CODE_EXISTS, 400);
		}
		if (coupon.maxUsageCount > 0 && coupon.usedCount >= coupon.maxUsageCount) {
			throw new AppError(ErrorCode.COUPON_CODE_EXISTS, 400);
		}
		await this.couponRepo.incrementUsedCount(couponId, tx);
	}
}
