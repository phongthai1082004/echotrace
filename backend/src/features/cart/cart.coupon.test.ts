import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { CartItem } from '@echotrace/shared';
import { computeCouponDiscount } from './cart.service.js';

const items = [{ price: 100000, quantity: 2 }] as CartItem[]; // subtotal 200000, qty 2
const coupon = (over: any = {}) => ({
	code: 'X',
	isActive: true,
	expiresAt: null,
	maxUsageCount: 0,
	usedCount: 0,
	minOrderType: 'VALUE',
	minOrderAmount: 0,
	discountType: 'PERCENTAGE',
	discountValue: 10,
	maxDiscountAmount: null,
	...over,
});

// inactive / expired / exhausted => 0
assert.equal(computeCouponDiscount(coupon({ isActive: false }), 200000, items), 0);
assert.equal(computeCouponDiscount(coupon({ expiresAt: new Date(Date.now() - 1000) }), 200000, items), 0);
assert.equal(computeCouponDiscount(coupon({ maxUsageCount: 5, usedCount: 5 }), 200000, items), 0);

// percentage vs fixed
assert.equal(computeCouponDiscount(coupon(), 200000, items), 20000); // 10% of 200k
assert.equal(computeCouponDiscount(coupon({ discountType: 'FIXED', discountValue: 50000 }), 200000, items), 50000);

// cap by maxDiscountAmount
assert.equal(computeCouponDiscount(coupon({ maxDiscountAmount: 15000 }), 200000, items), 15000);

// min order (VALUE) not met => 0
assert.equal(computeCouponDiscount(coupon({ minOrderAmount: 500000 }), 200000, items), 0);

// min order by QUANTITY
assert.equal(computeCouponDiscount(coupon({ minOrderType: 'QUANTITY', minOrderAmount: 3 }), 200000, items), 0);
assert.equal(computeCouponDiscount(coupon({ minOrderType: 'QUANTITY', minOrderAmount: 2 }), 200000, items), 20000);

// lowercase types from shared enums still work (DB stores UPPERCASE)
assert.equal(computeCouponDiscount(coupon({ discountType: 'percentage' }), 200000, items), 20000);

console.log('cart coupon: ok');