import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? `redis://localhost:${process.env.REDIS_PORT}`;

export class CacheService {
	private client: Redis;

	constructor(private ttlSeconds: number = 600) {
		this.client = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
		this.client.on('error', (err: Error) => console.error('[redis] connection error:', err.message));
	}

	async get<T>(key: string): Promise<T | undefined> {
		try {
			const raw = await this.client.get(key);
			return raw === null ? undefined : (JSON.parse(raw) as T);
		} catch {
			return undefined;
		}
	}

	async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
		try {
			await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds ?? this.ttlSeconds);
		} catch (err) {
			console.error('[redis] set failed:', err);
		}
	}

	async delete(...keys: string[]): Promise<void> {
		try {
			if (keys.length) await this.client.del(...keys);
		} catch {
			/* redis down — stale cache clears itself via TTL */
		}
	}
}