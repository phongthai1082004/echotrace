import { Page, expect } from '@playwright/test';

// Rate-limit bypass bằng env E2E_NO_RATELIMIT ở backend (signIn đi server-to-server,
// header XFF của browser không theo qua nên fake IP vô ích).
export async function loginAs(page: Page, email = 'user@test.local', password = 'Password123!') {
	await page.goto('/vi/auth');
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').first().fill(password);
	await page.locator('button[type="submit"]').click();
}

export async function loginAdmin(page: Page) {
	await loginAs(page, 'admin@test.local');
	await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
}
