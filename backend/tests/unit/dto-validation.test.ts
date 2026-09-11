/**
 * Plan section 3 — DTO validation (V-1..V-9) through the real `validateDto` middleware:
 * plainToInstance + class-validator whitelist + grouped `errors{field: msg[]}` shape.
 */
import { validateDto } from '../../src/shared/middleware/validator.middleware.js';
import { UpdateSampleBookDTO } from '../../../shared/dtos/sample-book/sample-book.dto.js';
import { CreateCouponDTO } from '../../../shared/dtos/coupon/coupon.dto.js';
import { SAMPLE_BOOK_CATEGORIES } from '../../../shared/constants/sample-book-category.js';
import bcrypt from 'bcryptjs';
import { mock } from 'jest-mock-extended';
import type { Request, Response, NextFunction } from 'express';

type RunResult = { forwarded: any; error: { errorCode: string; statusCode: number; details?: any } | null };

async function run(dtoClass: any, body: any): Promise<RunResult> {
	let forwarded: any = null;
	let captured: RunResult['error'] = null;
	const req = { body, i18n: { t: (_k: string, o: any) => o?.defaultValue ?? _k } } as unknown as Request;
	const next: NextFunction = (arg?: any) => {
		if (arg) captured = { errorCode: arg.errorCode, statusCode: arg.statusCode, details: arg.details };
		else forwarded = (req as any).body;
	};
	await validateDto(dtoClass)(req, {} as Response, next);
	return { forwarded, error: captured };
}

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

describe('V-3/V-4: CreateCouponDTO', () => {
	it('V-3: percentage coupon with cap accepted; fixed fields validated', async () => {
		const ok = await run(CreateCouponDTO, {
			code: 'T10', discountType: 'percentage', discountValue: 10, maxDiscountAmount: 5000,
		});
		expect(ok.error).toBeNull();
	});

	it('V-4: negative values rejected', async () => {
		for (const body of [
			{ code: 'X', discountType: 'fixed', discountValue: -5 },
			{ code: 'X', discountType: 'percentage', discountValue: 10, minOrderAmount: -1 },
		]) {
			const r = await run(CreateCouponDTO, body);
			expect(r.error?.errorCode).toBe('VALIDATION_FAILED');
		}
	});
});

describe('V-5/V-6: profile & password validation (users.service — plain interfaces, no decorators)', () => {
	it('V-5: malformed phone → USER_INVALID_PHONE; duplicate phone → USER_PHONE_EXISTS 409', async () => {
		const { ProfileService } = await import('../../src/modules/user/profile/profile.service.js');
		const repo = mock<any>();
		repo.client = { user: {} };
		repo.findByPhone.mockResolvedValue(null);
		repo.updateUser.mockResolvedValue({});
		repo.findByIdFull.mockResolvedValue({ id: 5, email: 'a@b.c', name: 'A', role: 'user' });
		const svc = new ProfileService(repo);

		await expect(svc.updateProfile('5', { phone: '12345' } as any)).rejects.toMatchObject({ statusCode: 400, errorCode: 'USER_INVALID_PHONE' });

		repo.findByPhone.mockResolvedValue({ id: 9 }); // someone else's phone
		await expect(svc.updateProfile('5', { phone: '0912345678' } as any)).rejects.toMatchObject({ statusCode: 409, errorCode: 'USER_PHONE_EXISTS' });

		repo.findByPhone.mockResolvedValue(null);
		await expect(svc.updateProfile('5', { phone: '0912345678' } as any)).resolves.toBeTruthy();
	});

	it('V-6: missing/wrong current password → 400; short new password → 400', async () => {
		const { ProfileService } = await import('../../src/modules/user/profile/profile.service.js');
		const repo = mock<any>();
		repo.findByIdForPassword.mockResolvedValue({ id: 5, password: bcrypt.hashSync('current', 4) });
		repo.updateUser.mockResolvedValue({});
		const svc = new ProfileService(repo);

		await expect(svc.changePassword('5', { currentPassword: '', newPassword: 'longenough1' } as any))
			.rejects.toMatchObject({ errorCode: 'USER_CURRENT_PASSWORD_REQUIRED' });
		await expect(svc.changePassword('5', { currentPassword: 'wrong', newPassword: 'longenough1' } as any))
			.rejects.toMatchObject({ errorCode: 'USER_CURRENT_PASSWORD_WRONG' });
		await expect(svc.changePassword('5', { currentPassword: 'current', newPassword: 'short' } as any))
			.rejects.toMatchObject({ errorCode: 'USER_NEW_PASSWORD_MIN_LENGTH' });
		await expect(svc.changePassword('5', { currentPassword: 'current', newPassword: 'longenough1' } as any))
			.resolves.toBeTruthy();
	});
});

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
