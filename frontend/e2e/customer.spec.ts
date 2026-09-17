import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// E-2: explore + my-journals hiện dữ liệu seed.
test('explore shows samples, my-journals shows own book', async ({ page }) => {
	await loginAs(page);
	await expect(page).toHaveURL(/\/explore/, { timeout: 20000 });
	await page.goto('/vi/explore');
	await expect(page.getByText('Mau E2E').first()).toBeVisible({ timeout: 15000 });
	await page.goto('/vi/my-journals');
	await expect(page.getByText('Sach E2E').first()).toBeVisible({ timeout: 15000 });
});

// E-3: dispatch (admin) liệt kê đơn seed.
test('admin dispatch lists seeded order', async ({ page }) => {
	await loginAs(page, 'admin@test.local');
	await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
	await page.goto('/vi/admin/dispatch');
	await expect(page.getByText('E2E123').first()).toBeVisible({ timeout: 15000 });
});

// E-4: chuông hiện đúng tiếng theo ngôn ngữ.
test('bell shows own language (vi default, en with cookie)', async ({ page }) => {
	await loginAs(page);
	await expect(page).toHaveURL(/\/explore/, { timeout: 20000 });
	await page.getByRole('button', { name: 'Thông báo' }).first().hover();
	await expect(page.getByText('E2E Chao').first()).toBeVisible({ timeout: 15000 });
});

test('bell shows English with en cookie', async ({ page, context }) => {
	await context.addCookies([{ name: 'i18nextLng', value: 'en', url: 'http://localhost:3100' }]);
	await loginAs(page);
	await expect(page).toHaveURL(/\/explore/, { timeout: 20000 });
	await page.goto('/en/explore');
	await page.getByRole('button', { name: 'Notifications' }).first().hover();
	await expect(page.getByText('E2E Hello').first()).toBeVisible({ timeout: 15000 });
});
