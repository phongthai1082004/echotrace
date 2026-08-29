import { injectable, inject } from 'tsyringe';
import { PdfService } from './pdf.service.js';
import { PdfRepository } from './pdf.repository.js';
import { PDF_MAX_ATTEMPTS } from './pdf.types.js';

@injectable()
export class PdfWorker {
	private timer: NodeJS.Timeout | null = null;
	private active = 0;
	// ponytail: số PDF render cùng lúc — define sẵn để không ngợp CPU/bandwidth.
	private readonly max = Math.max(1, Number(process.env.PDF_MAX_CONCURRENT ?? 2));
	private readonly intervalMs = Number(process.env.PDF_POLL_MS ?? 5000);

	constructor(
		@inject('PdfService') private pdf: PdfService,
		@inject('PdfRepository') private pdfRepo: PdfRepository,
	) {}

	start() {
		if (this.timer) return;
		void this.poll();
		this.timer = setInterval(() => void this.poll(), this.intervalMs);
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private async poll() {
		// ponytail: chỉ lấy job khi còn slot trống (giới hạn đồng thời).
		while (this.active < this.max) {
			const job = await this.claim();
			if (!job) break;
			this.active++;
			void this.run(job).finally(() => {
				this.active--;
			});
		}
	}

	// ponytail: claim nguyên tử — lấy PENDING / FAILED(chưa đủ attempts) / PROCESSING bị kẹt(stale).
	private async claim() {
		return this.pdfRepo.claimPdfJob();
	}

	private async run(job: { id: number; orderId: number }) {
		const cur = await this.pdfRepo.findPdfJob(job.id);
		try {
			await this.pdf.process(job.id, job.orderId);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			const next = (cur?.attempts ?? 0) + 1;
			// ponytail: hết attempts → FAILED (dừng); còn → PENDING (thử lại toàn bộ PDF).
			const status = next >= PDF_MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
			await this.pdfRepo
				.updatePdfJob(job.id, { attempts: next, status, lastError: msg.slice(0, 2000), lockedAt: null })
				.catch(() => {});
		}
	}
}
