import { test, expect, request as pwRequest } from '@playwright/test';

// E-8: mặc định tiếng Việt khắp nơi.
test('fresh profile / redirects to /vi', async ({ page }) => {
	// ponytail: run trước có thể kẹt cờ ON (rewrite giữ URL, không redirect) — tắt trước
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

	await page.goto('/');
	await expect(page).toHaveURL(/\/vi(\/|$)/, { timeout: 20000 });
	await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
});
