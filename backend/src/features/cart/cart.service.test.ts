import 'reflect-metadata';
import assert from 'node:assert';
import { computeItemPrice } from './cart.service.js';


assert.strictEqual(computeItemPrice(32, 10000, 2500, 1), 85000);
assert.strictEqual(computeItemPrice(33, 10000, 2500, 0.5), 49000);
assert.strictEqual(computeItemPrice(2, 10000, 2500, 1), 10000);
assert.strictEqual(computeItemPrice(1, 10000, 2500, 1), 10000);
console.log('computeItemPrice: OK');
