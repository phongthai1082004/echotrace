import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
// local dev DB for prisma cli (Neon/prod URL lives in .env, loaded too but overridden here)
const devEnv = dotenv.parse(fs.readFileSync('.env.development', 'utf8'));
if (devEnv.DATABASE_URL) process.env.DATABASE_URL = devEnv.DATABASE_URL;

export default defineConfig({
	datasource: {
		url: process.env.DATABASE_URL,
	},
});
