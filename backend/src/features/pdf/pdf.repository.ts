import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../lib/db.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

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

	upsertPdfJob(orderId: number) {
		return this.client.orderPdfJob.upsert({
			where: { orderId },
			create: { orderId, status: 'PENDING' },
			update: { status: 'PENDING', lockedAt: null, lastError: null, attempts: 0 },
		});
	}

	async claimPdfJob() {
		// ponytail: atomic single-statement claim (FOR UPDATE SKIP LOCKED) - the previous
		// findFirst+update let two backend instances claim the same job concurrently.
		const rows = await this.prismaService.db.$queryRaw<any[]>(Prisma.sql`
			UPDATE "OrderPdfJob" SET status = 'PROCESSING', "lockedAt" = now(), "updatedAt" = now()
			WHERE id = (
				SELECT id FROM "OrderPdfJob"
				WHERE status = 'PENDING'
				   OR (status = 'FAILED' AND attempts < 5)
				   OR (status = 'PROCESSING' AND "lockedAt" < now() - interval '10 minutes')
				ORDER BY "createdAt" ASC
				LIMIT 1
				FOR UPDATE SKIP LOCKED
			)
			RETURNING *`);
		return rows[0] ?? null;
	}

	findPdfJob(id: number) {
		return this.client.orderPdfJob.findUnique({ where: { id } });
	}

	updatePdfJob(id: number, data: Record<string, unknown>) {
		return this.client.orderPdfJob.update({ where: { id }, data: data as Prisma.OrderPdfJobUpdateInput });
	}
}
