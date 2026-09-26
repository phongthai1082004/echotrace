import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from './helpers';

// tắt thẳng qua API trước khi assert (idempotent).
async function maintenanceOff() {
	const api = await pwRequest.newContext({ baseURL: 'http://localhost:4101' });
	const login = await api.post('/api/auth/login', {
		data: { email: 'admin@test.local', password: 'Password123!' },
	});
	const token = (await login.json()).data.accessToken;
	await api.post('/api/admin/maintenance', {
		headers: { Authorization: `Bearer ${token}` },
		data: { enabled: false },
	});
	await api.dispose();
}

// E-9: đổi ngôn ngữ giữ cookie sau reload.
test('switch to ES persists across reload', async ({ page }) => {
	await page.goto('/vi');
	await page.getByRole('button', { name: 'Đổi ngôn ngữ' }).hover();
	await expect(page.getByRole('button', { name: 'ES', exact: true })).toBeVisible({ timeout: 10000 });
	await page.getByRole('button', { name: 'ES', exact: true }).click();
	await expect(page).toHaveURL(/\/es(\/|$)/, { timeout: 15000 });
	await page.reload();
	await expect(page).toHaveURL(/\/es(\/|$)/, { timeout: 15000 });
});

// E-11: maintenance ON → khách thấy trang bảo trì; OFF → vào lại.
test('maintenance gate blocks customer, admin reopens', async ({ browser }) => {
	await maintenanceOff();
	const adminCtx = await browser.newContext();
	const admin = await adminCtx.newPage();
	await loginAs(admin, 'admin@test.local');
	await expect(admin).toHaveURL(/\/admin/, { timeout: 20000 });
	await admin.goto('/vi/admin/maintenance');
	await admin.getByRole('button', { name: 'ON', exact: true }).click();
	await admin.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(admin.getByRole('button', { name: 'OFF', exact: true })).toBeVisible({ timeout: 15000 });

	const userCtx = await browser.newContext();
	const user = await userCtx.newPage();
	// Poll kèm reload để qua ngưỡng cache cờ 10s của proxy.
	await expect
		.poll(async () => {
			await user.goto('/vi/explore');
			return (await user.getByRole('heading', { name: /bảo trì/i }).count()) > 0;
		}, { timeout: 30000 })
		.toBe(true);

	await admin.getByRole('button', { name: 'OFF', exact: true }).click();
	await admin.getByRole('button', { name: 'Xác nhận' }).click();
	await expect
		.poll(async () => {
			await user.goto('/vi/explore');
			return (await user.getByRole('heading', { name: /bảo trì/i }).count()) > 0;
		}, { timeout: 30000 })
		.toBe(false);

	await userCtx.close();
	await adminCtx.close();
});

// E-10: admin tạo coupon qua UI (testid ổn định, DB thuần — không đụng R2).
test('E-10 admin creates coupon via UI', async ({ page }) => {
	await loginAs(page, 'admin@test.local');
	await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
	await page.goto('/vi/admin/coupons');
	await page.getByTestId('coupon-create-open').click();
	await page.getByTestId('coupon-code').fill('E2E10');
	await page.getByTestId('coupon-value').fill('15');
	await page.getByTestId('coupon-save').click();
	await expect(page.getByText('E2E10').first()).toBeVisible({ timeout: 15000 });
});
