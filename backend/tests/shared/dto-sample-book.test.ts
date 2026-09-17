/**
 * V-1/V-2/V-12/V-13: sample-book DTOs.
 */
import { run } from './helpers.js';
import {
	UpdateSampleBookDTO,
	CreateSampleBookDTO,
	UpdateSampleBookStatusDTO,
} from '../../../shared/dtos/sample-book/sample-book.dto.js';
import { SAMPLE_BOOK_CATEGORIES } from '../../../shared/constants/sample-book-category.js';

describe('V-1/V-2: UpdateSampleBookDTO', () => {
	it('V-1: every SAMPLE_BOOK_CATEGORIES value passes; null passes; absent is unchanged', async () => {
		for (const cat of SAMPLE_BOOK_CATEGORIES) {
			const r = await run(UpdateSampleBookDTO, { category: cat });
			expect(r.error).toBeNull();
			expect(r.forwarded.category).toBe(cat);
		}
		const r = await run(UpdateSampleBookDTO, { category: null });
		expect(r.error).toBeNull();
		expect(r.forwarded.category).toBeNull();
	});

	it('V-1b: arbitrary category string → VALIDATION_FAILED with field grouped', async () => {
		const r = await run(UpdateSampleBookDTO, { category: 'NOT_A_CATEGORY' });
		expect(r.error?.errorCode).toBe('VALIDATION_FAILED');
		expect(r.error?.statusCode).toBe(400);
		expect(Object.keys(r.error!.details ?? {})).toContain('category');
	});

	it('V-2: bad type / negative quantity / bad status → rejected', async () => {
		expect((await run(UpdateSampleBookDTO, { type: 'NOPE' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateSampleBookDTO, { quantity: -1 })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateSampleBookDTO, { status: 'nope' })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});

describe('V-12/V-13: CreateSampleBookDTO + UpdateSampleBookStatusDTO', () => {
	it('V-12: empty passes (all optional); full valid passes', async () => {
		expect((await run(CreateSampleBookDTO, {})).error).toBeNull();
		const r = await run(CreateSampleBookDTO, {
			name: 'M', type: 'TEMPLATE', category: 'NATURE', quantity: 5, status: 'draft',
		});
		expect(r.error).toBeNull();
	});

	it('V-12b: bad type / negative quantity / float int field fail', async () => {
		expect((await run(CreateSampleBookDTO, { type: 'NOPE' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreateSampleBookDTO, { quantity: -1 })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreateSampleBookDTO, { paperHeight: 10.5 })).error?.errorCode).toBe('VALIDATION_FAILED');
	});

	it('V-13: status in set passes; missing/bad fails', async () => {
		for (const status of ['draft', 'published', 'archive']) {
			expect((await run(UpdateSampleBookStatusDTO, { status })).error).toBeNull();
		}
		expect((await run(UpdateSampleBookStatusDTO, { status: 'nope' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateSampleBookStatusDTO, {})).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});
