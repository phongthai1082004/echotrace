import { execSync } from 'child_process';

export default async function globalSetup() {
	const env = {
		...process.env,
		DATABASE_URL: 'postgresql://postgres:123abc@localhost:5432/echotrace_test',
		ECHOTRACE_TEST_DB: 'postgresql://postgres:123abc@localhost:5432/echotrace_test',
	};
	execSync('pnpm --filter backend exec prisma migrate deploy', { cwd: '..', env, stdio: 'inherit' });
	execSync('pnpm --filter backend exec tsx tests/integration/seed-e2e.ts', { cwd: '..', env, stdio: 'inherit' });
}
