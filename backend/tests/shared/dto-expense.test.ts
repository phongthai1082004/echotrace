/**
 * V-17: CreateExpenseDTO.
 */
import { run } from './helpers.js';
import { CreateExpenseDTO } from '../../../shared/dtos/expense/expense.dto.js';

describe('V-17: CreateExpenseDTO', () => {
	it('full valid passes', async () => {
		const r = await run(CreateExpenseDTO, {
			amount: 150000,
			category: 'OPERATING',
			description: 'Giấy in',
			date: '2026-09-01',
			supplierName: 'NCC A',
			taxCode: '123',
			note: 'ghi chú',
		});
		expect(r.error).toBeNull();
	});

	it('minimal valid (amount + category) passes', async () => {
		expect((await run(CreateExpenseDTO, { amount: 1, category: 'OTHER' })).error).toBeNull();
	});

	it('zero/negative/NaN amount, bad category, bad date fail', async () => {
		for (const amount of [0, -5, 'abc', NaN]) {
			const r = await run(CreateExpenseDTO, { amount, category: 'OTHER' });
			expect(r.error?.errorCode).toBe('VALIDATION_FAILED');
		}
		expect((await run(CreateExpenseDTO, { amount: 10, category: 'NOPE' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreateExpenseDTO, { amount: 10 })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreateExpenseDTO, { amount: 10, category: 'OTHER', date: 'not-a-date' })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});
