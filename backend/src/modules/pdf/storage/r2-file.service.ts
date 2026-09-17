import { injectable, inject } from 'tsyringe';
import type {IR2ImageService} from '../../../shared/r2/r2.service.js';
import {PDF_FOLDER} from '../render/pdf.types.js';
import type {IR2FileService} from '../render/pdf.types.js';

@injectable()
export class R2FileService implements IR2FileService {
	constructor(@inject('IR2ImageService') private r2: IR2ImageService) {}

	// ponytail: worker chỉ nhận POST với header X-Echotrace-* (HMAC của `${folder}:${expiry}`),
	// folder phải bắt đầu "echotrace/". issueUpload() đã tính token đúng. Response { url }.
	async uploadBuffer(buffer: Buffer, folder: string = PDF_FOLDER): Promise<string> {
		const { token, expiry, uploadUrl } = await this.r2.issueUpload(folder);
		const res = await fetch(uploadUrl, {
			method: 'POST',
			headers: {
				'X-Echotrace-Token': token,
				'X-Echotrace-Folder': folder,
				'X-Echotrace-Expiry': String(expiry),
				'Content-Type': 'application/pdf',
			},
			body: buffer,
		} as any);
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`R2 pdf upload failed: ${res.status} ${text}`);
		}
		const data = (await res.json().catch(() => ({}))) as { url?: string };
		if (!data.url) throw new Error('R2 pdf upload returned no url');
		return data.url;
	}
}
