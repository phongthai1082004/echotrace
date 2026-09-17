/**
 * V-10/V-11: supplier DTOs.
 */
import { run } from './helpers.js';
import { CreateSupplierDTO } from '../../../shared/dtos/supplier/supplier.create.dto.js';
import { UpdateSupplierDTO } from '../../../shared/dtos/supplier/supplier.update.dto.js';

describe('V-10: CreateSupplierDTO', () => {
	const good = { name: 'NCC Hoa Sen', contact: '0912345678', email: 'ncc@hoasen.vn' };

	it('full valid body passes', async () => {
		const r = await run(CreateSupplierDTO, {
			...good,
			bankName: 'Vietcombank',
			bankAccountNumber: '123456789',
			bankAccountName: 'NGUYEN VAN A',
			optionIds: [1, 2],
		});
		expect(r.error).toBeNull();
	});

	it('name/contact/email/bank/account/optionIds violations fail per field', async () => {
		expect((await run(CreateSupplierDTO, { ...good, name: 'NCC 1' })).error?.errorCode).toBe('VALIDATION_FAILED');
		for (const contact of ['12345', '091234567', '091234567890']) {
			const r = await run(CreateSupplierDTO, { ...good, contact });
			expect(r.error?.errorCode).toBe('VALIDATION_FAILED');
		}
		for (const contact of ['0912345678', '09123456789']) {
			expect((await run(CreateSupplierDTO, { ...good, contact })).error).toBeNull();
		}
		expect((await run(CreateSupplierDTO, { ...good, email: 'not-an-email' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreateSupplierDTO, { name: 'NCC', contact: '0912345678' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreateSupplierDTO, { ...good, bankAccountNumber: '12AB' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(CreateSupplierDTO, { ...good, optionIds: [1, 'x'] })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});

describe('V-11: UpdateSupplierDTO (all optional)', () => {
	it('empty object passes; only sent fields validated', async () => {
		expect((await run(UpdateSupplierDTO, {})).error).toBeNull();
		expect((await run(UpdateSupplierDTO, { contact: '0912345678' })).error).toBeNull();
	});

	it('bad phone/email/account/date/array fail', async () => {
		expect((await run(UpdateSupplierDTO, { contact: 'abc' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateSupplierDTO, { email: 'bad' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateSupplierDTO, { bankAccountNumber: '12AB' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateSupplierDTO, { lastPaymentDate: 'not-a-date' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(UpdateSupplierDTO, { optionIds: ['x'] })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});
