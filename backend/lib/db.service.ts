import { prisma } from './prisma.js';

// ponytail: thin injectable wrapper quanh prisma client. Service inject cái này
// thay vì import global `prisma` → test cô lập được (swap `db` bằng fake).
export class PrismaService {
	constructor(public readonly db = prisma) {}
}
