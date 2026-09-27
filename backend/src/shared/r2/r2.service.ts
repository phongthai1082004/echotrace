import { injectable } from 'tsyringe';

export interface IR2ImageService {
	issueUpload(folder: string): Promise<{ token: string; folder: string; expiry: number; uploadUrl: string }>;
	deleteAsset(publicId: string): Promise<unknown>;
}

export function isR2PublicUrl(url: unknown): boolean {
	if (typeof url !== 'string') return false;
	try {
		const u = new URL(url);
		if (u.protocol !== 'https:') return false;
		return u.hostname === new URL(process.env.R2_WORKER_URL!).hostname;
	} catch {
		return false;
	}
}

@injectable()
export class R2ImageService implements IR2ImageService {
	private workerUrl = process.env.R2_WORKER_URL!;

	async issueUpload(folder: string) {
		const expiry = Math.round(Date.now() / 1000) + 600; 
		const token = await this.hmacHex(`${folder}:${expiry}`);
		return { token, folder, expiry, uploadUrl: this.workerUrl };
	}

	async deleteAsset(publicId: string) {
		const res = await fetch(this.workerUrl, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.R2_ADMIN_TOKEN}`,
			},
			body: JSON.stringify({ publicId }),
		});
		if (!res.ok) throw new Error(`R2 delete failed: ${res.status}`);
		return res.json();
	}

	private async hmacHex(data: string): Promise<string> {
		const key = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(process.env.R2_UPLOAD_SECRET),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign'],
		);
		const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
		return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
	}
}
