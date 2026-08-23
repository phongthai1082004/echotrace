import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// ponytail: ghép URL từ DB_* khi chưa có DATABASE_URL — password encode vì có thể chứa @/%/:
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
const connectionString =
	process.env.DATABASE_URL ??
	(DB_HOST && DB_NAME
		? `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD ?? '')}@${DB_HOST}:${DB_PORT || '5432'}/${DB_NAME}`
		: undefined);

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
