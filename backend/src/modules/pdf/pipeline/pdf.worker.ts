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
	// ponytail: số PDF render cùng lúc — define sẵn để không ngợp CPU/bandwidth.
	private readonly max = Math.max(1, Number(process.env.PDF_MAX_CONCURRENT ?? 2));
	private readonly baseMs = Number(process.env.PDF_POLL_MS ?? 5000);
	// ponytail: rỗi thì ngủ hẳn (không timer) để Neon suspend — enqueue() kick() đánh thức.

	constructor(
		@inject('PdfService') private pdf: PdfService,
		@inject('PdfRepository') private pdfRepo: PdfRepository,
	) {}

	start() {
		if (!this.stopped) return;
		this.stopped = false;
		// ponytail: 1 tick lúc boot để dọn job tồn — xong rỗi thì ngủ, chờ kick().
		if (!this.polling && !this.timer) void this.tick();
	}

	stop() {
		this.stopped = true;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	// ponytail: đường đánh thức duy nhất khi rỗi — enqueue() gọi, PDF mới chạy trong vài giây.
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
			found = false; // ponytail: DB sập thì ngủ, chờ kick sau — đừng nện thêm.
		}
		this.polling = false;
		if (this.stopped) return;
		// ponytail: còn việc (vừa claim / render đang chạy) thì hẹn tick kế;
		// rỗi hẳn (không job, không render) thì ngủ — không timer, Neon được suspend.
		if (found || this.active > 0) {
			this.timer = setTimeout(() => {
				this.timer = null;
				void this.tick();
			}, this.baseMs);
		}
	}

	private async poll(): Promise<boolean> {
		// ponytail: chỉ lấy job khi còn slot trống (giới hạn đồng thời).
		let found = false;
		while (this.active < this.max) {
			const job = await this.claim();
			if (!job) break;
			found = true;
			this.active++;
			void this.run(job).finally(() => {
				this.active--;
				// ponytail: render xong có thể trống slot cho job chờ — đánh thức 1 tick nếu đang ngủ.
				this.kick();
			});
		}
		return found;
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
