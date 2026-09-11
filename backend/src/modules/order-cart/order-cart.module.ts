import type { DependencyContainer } from 'tsyringe';
import { OrderRepository } from './repositories/order.repository.js';
import { CheckoutService } from './checkout/checkout.service.js';
import { OrderLifecycleService } from './lifecycle/order-lifecycle.service.js';
import { ReturnsService } from './returns/returns.service.js';
import { OrderHistoryService } from './history/order-history.service.js';
import { CartService } from './cart/cart.service.js';
import { CartRepository } from './cart/cart.repository.js';
import { CouponService } from './coupons/coupons.service.js';
import { CouponRepository } from './coupons/coupons.repository.js';

export function registerOrderCart(container: DependencyContainer): void {
	container.registerSingleton('OrderRepository', OrderRepository);
	container.registerSingleton('ICheckoutService', CheckoutService);
	container.registerSingleton('IOrderLifecycleService', OrderLifecycleService);
	container.registerSingleton('IReturnsService', ReturnsService);
	container.registerSingleton('IOrderHistoryService', OrderHistoryService);
	container.registerSingleton('ICartService', CartService);
	container.registerSingleton('CartRepository', CartRepository);
	container.registerSingleton('ICouponService', CouponService);
	container.registerSingleton('CouponRepository', CouponRepository);
}
