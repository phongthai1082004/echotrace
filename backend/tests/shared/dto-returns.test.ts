/**
 * V-19: RequestReturnDTO (nested items).
 */
import { run } from './helpers.js';
import { RequestReturnDTO } from '../../../shared/dtos/returns/returns.dto.js';

describe('V-19: RequestReturnDTO', () => {
	it('empty + reason-only pass', async () => {
		expect((await run(RequestReturnDTO, {})).error).toBeNull();
		expect((await run(RequestReturnDTO, { reason: 'rách' })).error).toBeNull();
	});

	it('valid items pass', async () => {
		const r = await run(RequestReturnDTO, {
			items: [
				{ index: 0, quantity: 1 },
				{ index: 2, quantity: 3, defect: 'rách góc' },
			],
		});
		expect(r.error).toBeNull();
	});

	it('non-array / float index / zero quantity fail', async () => {
		expect((await run(RequestReturnDTO, { items: 'x' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(RequestReturnDTO, { items: [{ index: 0.5, quantity: 1 }] })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(RequestReturnDTO, { items: [{ index: 0, quantity: 0 }] })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(RequestReturnDTO, { items: [{ quantity: 1 }] })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});
