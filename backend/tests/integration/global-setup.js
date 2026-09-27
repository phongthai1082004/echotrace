const { execSync } = require('child_process');

module.exports = async () => {
	const env = {
		...process.env,
		DATABASE_URL: 'postgresql://postgres:123abc@localhost:5432/echotrace_test',
		ECHOTRACE_TEST_DB: 'postgresql://postgres:123abc@localhost:5432/echotrace_test',
	};
	execSync('pnpm exec prisma migrate deploy', {
		cwd: __dirname + '/../..',
		env,
		stdio: 'inherit',
	});
};
