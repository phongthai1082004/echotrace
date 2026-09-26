import { prisma } from './prisma.js';

// thay vì import global `prisma` → test cô lập được (swap `db` bằng fake).
export class PrismaService {
	constructor(public readonly db = prisma) {}
}
