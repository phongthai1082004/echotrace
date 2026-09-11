/**
 * Plan section 2.7 (Q-12) — PdfWorker concurrency cap (PDF_MAX_CONCURRENT).
 * PdfService.process and PdfRepository are mocked; the worker's poll loop is driven for real.
 */
import { PdfWorker } from '../../src/modules/pdf/pipeline/pdf.worker.js';
import type { PdfService } from '../../src/modules/pdf/pipeline/pdf.service.js';
import type { PdfRepository } from '../../src/modules/pdf/storage/pdf.repository.js';

describe('Q-12: PdfWorker respects PDF_MAX_CONCURRENT', () => {
	it('never claims a third job while two renders are in flight', async () => {
		process.env.PDF_MAX_CONCURRENT = '2';
		process.env.PDF_POLL_MS = '30'; // fast re-poll for the freed slot
		const pdf = { process: jest.fn() } as unknown as PdfService;
		const repo = { claimPdfJob: jest.fn(), findPdfJob: jest.fn(), updatePdfJob: jest.fn() } as unknown as PdfRepository;

		const gates: Array<() => void> = [];
		(pdf.process as jest.Mock).mockImplementation(
			() => new Promise<void>((resolve) => gates.push(resolve)),
		);
		repo.findPdfJob = jest.fn().mockResolvedValue({ attempts: 0 }) as any;
		repo.updatePdfJob = jest.fn().mockResolvedValue({}) as any;

		let claimNo = 0;
		(repo.claimPdfJob as jest.Mock).mockImplementation(() => {
			claimNo++;
			if (claimNo <= 3) return Promise.resolve({ id: claimNo, orderId: claimNo });
			return Promise.resolve(null);
		});

		const worker = new PdfWorker(pdf, repo);
		worker.start();

		// let the synchronous first poll + microtasks run
		await new Promise((r) => setTimeout(r, 50));
		expect((pdf.process as jest.Mock).mock.calls.length).toBe(2); // capped at 2
		expect((repo.claimPdfJob as jest.Mock).mock.calls.length).toBe(2); // no third claim while busy

		gates.forEach((g) => g()); // release both renders -> free slots
		const third = await new Promise<number>((resolve) => {
			const t = setInterval(() => {
				if ((pdf.process as jest.Mock).mock.calls.length >= 3) { clearInterval(t); resolve(3); }
			}, 20);
			setTimeout(() => { clearInterval(t); resolve((pdf.process as jest.Mock).mock.calls.length); }, 1000);
		});
		expect(third).toBe(3); // third job claimed after a slot freed
		worker.stop();
	});

	it('stop() halts the poll loop', async () => {
		process.env.PDF_MAX_CONCURRENT = '1';
		const pdf = { process: jest.fn().mockResolvedValue(undefined) } as unknown as PdfService;
		const repo = { claimPdfJob: jest.fn().mockResolvedValue(null), findPdfJob: jest.fn(), updatePdfJob: jest.fn() } as unknown as PdfRepository;
		const worker = new PdfWorker(pdf, repo);
		worker.start();
		worker.stop();
		await new Promise((r) => setTimeout(r, 20));
		const callsAfterStop = (repo.claimPdfJob as jest.Mock).mock.calls.length;
		await new Promise((r) => setTimeout(r, 30));
		expect((repo.claimPdfJob as jest.Mock).mock.calls.length).toBe(callsAfterStop);
	});
});
