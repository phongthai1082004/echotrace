import { injectable, inject } from 'tsyringe';
import { CacheService } from './cache.service.js';

// ponytail: domain cache for the global print-option catalog — owned here so the two
// consumers (print-options CRUD + suppliers assignment) share one key/invalidation path.
@injectable()
export class OptionCatalogCacheService {
	constructor(@inject('CacheService') private cache: CacheService) {}

	async getCatalog<T>(type: string): Promise<T | undefined> {
		return this.cache.get<T>(`catalog:${type}`);
	}

	async setCatalog(type: string, value: unknown): Promise<void> {
		await this.cache.set(`catalog:${type}`, value);
	}

	async getInfo<T>(type: string, code: string): Promise<T | undefined> {
		return this.cache.get<T>(`info:${type}:${code}`);
	}

	async setInfo(type: string, code: string, value: unknown): Promise<void> {
		await this.cache.set(`info:${type}:${code}`, value);
	}

	// option metadata changed (create/update/remove) — drop both catalog + info for that type/code
	async invalidateOption(type: string, code: string): Promise<void> {
		await this.cache.delete(`catalog:${type}`, `info:${type}:${code}`);
	}

	// supplier assignment changed — catalog per type is supplier-agnostic, info keys unaffected
	async invalidateCatalogForTypes(...types: string[]): Promise<void> {
		await this.cache.delete(...types.map((t) => `catalog:${t}`));
	}
}