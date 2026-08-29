import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../lib/db.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PDF_MAX_ATTEMPTS } from './pdf.types.js';

// ponytail: repository layer — tách truy cập Prisma của feature pdf ra khỏi service.
// Các method trả PrismaPromise (dùng this.client) để gộp vào $transaction array form.
@injectable()
export class PdfRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	findOrderById(id: number, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.findUnique({ where: { id } });
	}

	findBooksByIds(ids: number[], tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).book.findMany({ where: { id: { in: ids } }, select: { id: true, type: true } });
	}

	updateOrderPdf(orderId: number, pdfUrl: string, orderItems: unknown, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).order.update({
			where: { id: orderId },
			data: { pdfUrl, orderItems: orderItems as Prisma.InputJsonValue },
		});
	}

	markPdfJobDone(jobId: number, pdfUrl: string, tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).orderPdfJob.update({
			where: { id: jobId },
			data: { status: 'DONE', pdfUrl, attempts: { increment: 1 }, processedAt: new Date(), lastError: null },
		});
	}

	// ponytail: idempotent enqueue — 1 order = 1 pdf job (unique orderId). Reset về PENDING để replay.
	upsertPdfJob(orderId: number) {
		return this.client.orderPdfJob.upsert({
			where: { orderId },
			create: { orderId, status: 'PENDING' },
			update: { status: 'PENDING', lockedAt: null, lastError: null, attempts: 0 },
		});
	}

	// ponytail: claim nguyên tử — lấy PENDING / FAILED(chưa đủ attempts) / PROCESSING bị kẹt(stale).
	claimPdfJob() {
		const stale = new Date(Date.now() - 10 * 60 * 1000);
		return this.client.$transaction(async (tx) => {
			const job = await tx.orderPdfJob.findFirst({
				where: {
					OR: [
						{ status: 'PENDING' },
						{ status: 'FAILED', attempts: { lt: PDF_MAX_ATTEMPTS } },
						{ status: 'PROCESSING', lockedAt: { lt: stale } },
					],
				},
				orderBy: { createdAt: 'asc' },
			});
			if (!job) return null;
			await tx.orderPdfJob.update({ where: { id: job.id }, data: { status: 'PROCESSING', lockedAt: new Date() } });
			return job;
		});
	}

	findPdfJob(id: number) {
		return this.client.orderPdfJob.findUnique({ where: { id } });
	}

	updatePdfJob(id: number, data: Record<string, unknown>) {
		return this.client.orderPdfJob.update({ where: { id }, data: data as Prisma.OrderPdfJobUpdateInput });
	}
}
