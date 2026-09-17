import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
// integration tests point here at the disposable test DB (never Neon/dev).
if (process.env.ECHOTRACE_TEST_DB) {
	process.env.DATABASE_URL = process.env.ECHOTRACE_TEST_DB;
}
// local dev DB for prisma cli (Neon/prod URL lives in .env, loaded too but overridden here).
// .env.development exists only on dev machines �?" on VPS fall back to plain .env.
else if (fs.existsSync('.env.development')) {
	const devEnv = dotenv.parse(fs.readFileSync('.env.development', 'utf8'));
	if (devEnv.DATABASE_URL) process.env.DATABASE_URL = devEnv.DATABASE_URL;
}

export default defineConfig({
	datasource: {
		url: process.env.DATABASE_URL,
	},
});
