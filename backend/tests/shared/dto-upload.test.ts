/**
 * V-21: SaveImageDTO.
 */
import { run } from './helpers.js';
import { SaveImageDTO } from '../../../shared/dtos/upload/upload.dto.js';

describe('V-21: SaveImageDTO', () => {
	it('url-only passes; full valid passes', async () => {
		expect((await run(SaveImageDTO, { url: 'https://r2/x.jpg' })).error).toBeNull();
		const r = await run(SaveImageDTO, {
			url: 'https://r2/x.jpg',
			publicId: 'p1',
			width: 800,
			height: 600,
			size: 12345,
			thumbUrl: 'https://r2/t.jpg',
		});
		expect(r.error).toBeNull();
	});

	it('missing/empty url, float/zero dims fail', async () => {
		expect((await run(SaveImageDTO, {})).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(SaveImageDTO, { url: '' })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(SaveImageDTO, { url: 'https://r2/x.jpg', width: 800.5 })).error?.errorCode).toBe('VALIDATION_FAILED');
		expect((await run(SaveImageDTO, { url: 'https://r2/x.jpg', size: 0 })).error?.errorCode).toBe('VALIDATION_FAILED');
	});
});
