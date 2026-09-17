/**
 * V-14/V-15: print-option DTOs (nested MultiLangText).
 */
import { run } from './helpers.js';
import { CreatePrintOptionDTO } from '../../../shared/dtos/print-option/print-option.create.dto.js';
import { UpdatePrintOptionDTO } from '../../../shared/dtos/print-option/print-option.update.dto.js';

describe('V-14/V-15: print-option DTOs (nested MultiLangText)', () => {
	const name = { vi: 'Giấy', en: 'Paper', es: 'Papel' };

	it('V-14: full valid passes', async () => {
		const r = await run(CreatePrintOptionDTO, { type: 'paper', code: 'P1', name, width: 100, price: 5000 });
		expect(r.error).toBeNull();
	});

	it('V-14b: missing lang / bad type / width 0 / negative price fail', async () => {
		expect((await run(CreatePrintOptionDTO, { type: 'paper', code: 'P1', name: { vi: 'x' } })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreatePrintOptionDTO, { type: 'NOPE', code: 'P1', name })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreatePrintOptionDTO, { type: 'paper', code: 'P1', name, width: 0 })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreatePrintOptionDTO, { type: 'paper', code: 'P1', name, price: -1 })).error?.errorCode).toBe('VALIDATION_FAILED');
	});

	it('V-15: update empty passes; partial bad nested fails', async () => {
		expect((await run(UpdatePrintOptionDTO, {})).error).toBeNull();
		expect((await run(UpdatePrintOptionDTO, { name: { vi: 'x' } })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdatePrintOptionDTO, { width: 2.5 })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});
