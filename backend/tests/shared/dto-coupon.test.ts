/**
 * V-3/V-4: CreateCouponDTO.
 */
import { run } from './helpers.js';
import { CreateCouponDTO } from '../../../shared/dtos/coupon/coupon.dto.js';

describe('V-3/V-4: CreateCouponDTO', () => {
	it('V-3: percentage coupon with cap accepted; fixed fields validated', async () => {
		const ok = await run(CreateCouponDTO, {
			code: 'T10', discountType: 'percentage', discountValue: 10, maxDiscountAmount: 5000,
		});
		expect(ok.error).toBeNull();
	});

	it('V-4: negative values rejected', async () => {
		for (const body of [
			{ code: 'X', discountType: 'fixed', discountValue: -5 },
			{ code: 'X', discountType: 'percentage', discountValue: 10, minOrderAmount: -1 },
		]) {
			const r = await run(CreateCouponDTO, body);
			expect(r.error?.errorCode).toBe('VALIDATION_FAILED');
		}
	});
});
