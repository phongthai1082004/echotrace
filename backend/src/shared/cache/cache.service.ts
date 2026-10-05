import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? `redis://localhost:${process.env.REDIS_PORT ?? '6379'}`;

export class CacheService {
	private client: Redis;

	constructor(private ttlSeconds: number = 600) {
		this.client = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
		this.client.on('error', (err: Error) => console.error('[redis] connection error:', err.message));
	}

	async ping(): Promise<boolean> {
		try {
			await this.client.ping();
			return true;
		} catch {
			return false;
		}
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
			const raw = JSON.stringify(value);
			// ponytail: DTO book kèm thumbnail base64 (MBs) — cache nó tràn 96mb redis, bỏ qua.
			// add khi cần cache book lớn: strip thumbnail base64 trước khi set.
			if (raw.length > 512 * 1024) return;
			await this.client.set(key, raw, 'EX', ttlSeconds ?? this.ttlSeconds);
		} catch (err) {
			// ponytail: READONLY replica / redis down — fail-open, log 1 dòng (không dump args MBs).
			console.warn('[redis] set failed:', key, (err as Error)?.message || err);
		}
	}

	async delete(...keys: string[]): Promise<void> {
		try {
			if (keys.length) await this.client.del(...keys);
		} catch {
			/* redis down — stale cache clears itself via TTL */
		}
	}

	// shared across process instances (e.g. OTP brute-force protection).
	// Returns the new value, or Infinity when Redis is unavailable (fail-open: do not block).
	async increment(key: string, ttlSeconds: number): Promise<number> {
		try {
			const val = await this.client.incr(key);
			if (val === 1) await this.client.expire(key, ttlSeconds); // set TTL on first write
			return val;
		} catch {
			return Infinity; // Redis down → fail-open (let the request through)
		}
	}
}