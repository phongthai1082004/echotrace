import 'reflect-metadata';
import assert from 'node:assert';
import { computeItemPrice } from './cart.service.js';

// (pages - 2) * perPage * factor + cover
assert.strictEqual(computeItemPrice(32, 10000, 2500, 1), 85000); // 30 trang × 2500 + bìa
assert.strictEqual(computeItemPrice(33, 10000, 2500, 0.5), 49000); // 38750 + bìa → làm tròn lên nghìn
assert.strictEqual(computeItemPrice(2, 10000, 2500, 1), 10000); // chỉ còn bìa
assert.strictEqual(computeItemPrice(1, 10000, 2500, 1), 10000); // pages < 2 không âm
console.log('computeItemPrice: OK');
