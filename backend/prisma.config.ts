import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
const url =
	process.env.DATABASE_URL ??
	(DB_HOST && DB_NAME
		? `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD ?? '')}@${DB_HOST}:${DB_PORT || '5432'}/${DB_NAME}`
		: undefined);

export default defineConfig({
	datasource: {
		url,
	},
});
