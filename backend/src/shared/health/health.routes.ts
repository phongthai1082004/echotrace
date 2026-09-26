import { Router, Request, Response } from 'express';
import { container } from '../../di/container.js';
import { PrismaService } from '../../../lib/db.service.js';
import { CacheService } from '../cache/cache.service.js';

export const healthRoutes = Router();

const ok = <T>(p: Promise<T>) => p.then(() => true, () => false);

healthRoutes.get('/ready', async (_req: Request, res: Response) => {
	const withTimeout = (p: Promise<boolean>) =>
		Promise.race([ok(p), new Promise<false>((r) => setTimeout(() => r(false), 3000))]);

	const [postgres, redis] = await Promise.all([
		withTimeout(container.resolve(PrismaService).db.$queryRaw`SELECT 1`),
		withTimeout(Promise.resolve(container.resolve(CacheService).ping())),
	]);

	const checks = { postgres: postgres ? 'ok' : 'down', redis: redis ? 'ok' : 'down' };
	const status = postgres && redis ? 'ok' : 'degraded';
	res.status(status === 'ok' ? 200 : 503).json({ status, checks });
});
