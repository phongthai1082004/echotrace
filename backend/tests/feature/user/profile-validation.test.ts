/**
 * V-5/V-6: profile & password validation (users.service — plain interfaces, no decorators).
 */
import bcrypt from 'bcryptjs';
import { mock } from 'jest-mock-extended';
import { ProfileService } from '../../../src/modules/user/profile/profile.service.js';

describe('V-5/V-6: profile & password validation (users.service — plain interfaces, no decorators)', () => {
	it('V-5: malformed phone → USER_INVALID_PHONE; duplicate phone → USER_PHONE_EXISTS 409', async () => {
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
