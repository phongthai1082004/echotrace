import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// E-5..E-7: admin gửi broadcast VI/EN qua modal → user thấy đúng tiếng (SSE live),
// menu … có đủ 2 mục đọc/chưa đọc.
test('admin broadcasts, users see own language live', async ({ browser }) => {
	const adminCtx = await browser.newContext();
	const admin = await adminCtx.newPage();
	await loginAs(admin, 'admin@test.local');
	await expect(admin).toHaveURL(/\/admin/, { timeout: 20000 });
	await admin.goto('/vi/admin/notifications');

	await admin.getByRole('button', { name: 'Gửi' }).first().click();
	await admin.getByPlaceholder('VI — VD:').fill('E2E Blast');
	await admin.locator('textarea').fill('Noi dung blast');
	await admin.getByRole('button', { name: 'en', exact: true }).click();
	await admin.getByPlaceholder('EN — VD:').fill('E2E Blast EN');
	await admin.locator('textarea').fill('Blast body');
	await admin.getByRole('button', { name: 'Gửi' }).last().click();
	await expect(admin.getByText(/Đã gửi tới \d+ người dùng/)).toBeVisible({ timeout: 15000 });

	// user VI thấy live qua SSE
	const userCtx = await browser.newContext();
	const user = await userCtx.newPage();
	await loginAs(user);
	await expect(user).toHaveURL(/\/explore/, { timeout: 20000 });
	await user.getByRole('button', { name: 'Thông báo' }).first().hover();
	await expect(user.getByText('E2E Blast').first()).toBeVisible({ timeout: 20000 });

	// menu … đủ 2 mục
	await user.getByRole('button', { name: '…' }).first().click();
	await expect(user.getByText('Đánh dấu đã đọc')).toBeVisible();
	await expect(user.getByText('Đánh dấu chưa đọc')).toBeVisible();
	await user.getByText('Đánh dấu đã đọc').click();

	// user EN thấy bản tiếng Anh
	const enCtx = await browser.newContext();
	await enCtx.addCookies([{ name: 'i18nextLng', value: 'en', url: 'http://localhost:3100' }]);
	const en = await enCtx.newPage();
	await loginAs(en);
	await expect(en).toHaveURL(/\/explore/, { timeout: 20000 });
	await en.goto('/en/explore');
	await en.getByRole('button', { name: 'Notifications' }).first().hover();
	await expect(en.getByText('E2E Blast EN').first()).toBeVisible({ timeout: 15000 });

	await userCtx.close();
	await enCtx.close();
	await adminCtx.close();
});
