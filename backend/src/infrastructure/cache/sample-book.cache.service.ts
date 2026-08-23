import { injectable, inject } from 'tsyringe';
import { CacheService } from './cache.service.js';

// ponytail: domain cache for sample books — sample:<id> (detail) + samples:<explore|albums> (public grid).
@injectable()
export class SampleBookCacheService {
	constructor(@inject('CacheService') private cache: CacheService) {}

	async getSample<T>(id: number): Promise<T | undefined> {
		return this.cache.get<T>(`sample:${id}`);
	}

	async setSample(id: number, value: unknown): Promise<void> {
		await this.cache.set(`sample:${id}`, value);
	}

	async invalidateSample(id: number): Promise<void> {
		await this.cache.delete(`sample:${id}`);
	}

	async getList<T>(key: 'explore' | 'albums'): Promise<T | undefined> {
		return this.cache.get<T>(`samples:${key}`);
	}

	async setList(key: 'explore' | 'albums', value: unknown): Promise<void> {
		await this.cache.set(`samples:${key}`, value);
	}

	async invalidateSamples(): Promise<void> {
		await this.cache.delete('samples:explore', 'samples:albums');
	}
}