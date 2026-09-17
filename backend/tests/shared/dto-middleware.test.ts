/**
 * V-9: generic middleware behavior (whitelist + error grouping).
 */
import { run } from './helpers.js';
import { UpdateSampleBookDTO } from '../../../shared/dtos/sample-book/sample-book.dto.js';

describe('V-9: generic middleware behavior', () => {
	it('whitelists unknown properties (req.body replaced with the DTO instance)', async () => {
		const r = await run(UpdateSampleBookDTO, { category: 'MINIMAL', evilField: 'drop me' });
		expect(r.error).toBeNull();
		expect(r.forwarded).not.toHaveProperty('evilField');
	});

	it('groups multiple field errors into details{field: msg[]}', async () => {
		const r = await run(UpdateSampleBookDTO, { type: 'NOPE', status: 'NOPE' });
		expect(r.error?.errorCode).toBe('VALIDATION_FAILED');
		expect(Object.keys(r.error!.details ?? {}).sort()).toEqual(['status', 'type']);
		expect(Array.isArray(r.error!.details!.type)).toBe(true);
	});
});
