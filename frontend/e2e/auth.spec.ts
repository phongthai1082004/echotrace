import { test, expect } from '@playwright/test';

// E-1: login credentials → vào explore.
test('user login lands on explore', async ({ page }) => {
	await page.goto('/vi/auth');
	await page.locator('input[type="email"]').fill('user@test.local');
	await page.locator('input[type="password"]').first().fill('Password123!');
	await page.locator('button[type="submit"]').click();
	await expect(page).toHaveURL(/\/explore/, { timeout: 20000 });
});
