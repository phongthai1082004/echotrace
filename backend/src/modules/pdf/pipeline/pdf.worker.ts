import { injectable, inject } from 'tsyringe';
import { PdfService } from './pdf.service.js';
import { PdfRepository } from '../storage/pdf.repository.js';
import { PDF_MAX_ATTEMPTS } from '../render/pdf.types.js';

@injectable()
export class PdfWorker {
	private timer: NodeJS.Timeout | null = null;
	private active = 0;
	private polling = false;
	private stopped = true;
	private readonly max = Math.max(1, Number(process.env.PDF_MAX_CONCURRENT ?? 2));
	private readonly baseMs = Number(process.env.PDF_POLL_MS ?? 5000);

	constructor(
		@inject('PdfService') private pdf: PdfService,
		@inject('PdfRepository') private pdfRepo: PdfRepository,
	) {}

	start() {
		if (!this.stopped) return;
		this.stopped = false;
		if (!this.polling && !this.timer) void this.tick();
	}

	stop() {
		this.stopped = true;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	kick() {
		if (this.stopped || this.polling) return;
		if (this.timer) return; // đang có hẹn bận — tick đó sẽ bắt job
		void this.tick();
	}

	private async tick() {
		if (this.stopped || this.polling) return;
		this.polling = true;
		let found = false;
		try {
			found = await this.poll();
		} catch {
			found = false;
		}
		this.polling = false;
		if (this.stopped) return;
		// rỗi hẳn (không job, không render) thì ngủ — không timer, Neon được suspend.
		if (found || this.active > 0) {
			this.timer = setTimeout(() => {
				this.timer = null;
				void this.tick();
			}, this.baseMs);
		}
	}

	private async poll(): Promise<boolean> {
		let found = false;
		while (this.active < this.max) {
			const job = await this.claim();
			if (!job) break;
			found = true;
			this.active++;
			void this.run(job).finally(() => {
				this.active--;
				this.kick();
			});
		}
		return found;
	}

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
			const status = next >= PDF_MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
			await this.pdfRepo
				.updatePdfJob(job.id, { attempts: next, status, lastError: msg.slice(0, 2000), lockedAt: null })
				.catch(() => {});
		}
	}
}
