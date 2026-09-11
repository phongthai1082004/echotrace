import { CouponService } from './coupons.service.js';
import { CouponRepository } from './coupons.repository.js';
import type { DependencyContainer } from 'tsyringe';

export { CouponService };
export { CouponRepository } from './coupons.repository.js';
export { CouponController } from './coupons.controller.js';

export function register(container: DependencyContainer): void {
	container.registerSingleton('ICouponService', CouponService);
	container.registerSingleton('CouponRepository', CouponRepository);
}
