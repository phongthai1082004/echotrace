import { defineConfig } from '@playwright/test';

const TEST_DB = 'postgresql://postgres:123abc@localhost:5432/echotrace_test';

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	timeout: 60000,
	retries: 0,
	workers: 1,
	use: {
		baseURL: 'http://localhost:3100',
		trace: 'retain-on-failure',
	},
	webServer: [
		{
			command: 'pnpm --filter backend exec tsx src/server.ts',
			cwd: '..',
			env: {
				DATABASE_URL: TEST_DB,
				ECHOTRACE_TEST_DB: TEST_DB,
				BACKEND_PORT: '4101',
				NEXTAUTH_URL: 'http://localhost:3100',
				RESEND_API_KEY: '',
				E2E_NO_RATELIMIT: '1',
			},
			url: 'http://localhost:4101/health',
			timeout: 120000,
			reuseExistingServer: false,
		},
		{
			command: 'pnpm exec next start -p 3100',
			env: {
				NEXTAUTH_URL: 'http://localhost:3100',
				NEXT_PUBLIC_BACKEND_URL: 'http://localhost:4101',
				BACKEND_URL: 'http://localhost:4101',
				NEXTAUTH_SECRET: 'test-e2e-secret',
				GOOGLE_CLIENT_ID: 'dummy',
				GOOGLE_CLIENT_SECRET: 'dummy',
			},
			url: 'http://localhost:3100/vi',
			timeout: 180000,
			reuseExistingServer: false,
		},
	],
});
