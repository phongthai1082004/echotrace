import { injectable } from 'tsyringe';
import { UUID } from 'crypto';
import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { IdempotencyKeyType } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
export abstract class IPaymentService {}

@injectable()
export class PaymentService implements IPaymentService {
	async createOrder(idempotencyKey: UUID, requestBody: string) {
		try {

			// Mark transaction starts
			const existing = await prisma.idempotencyKey.findUnique({
				where: {
					key: idempotencyKey,
				},
			});
			if (existing) {
				if (existing.status == IdempotencyKeyType.SUCCESS) {
					
				} else if (existing.status == IdempotencyKeyType.FAILED) {

				} else if (existing.status == IdempotencyKeyType.PROCESSING) {
					// throw new AppError(ErrorCode.CONFLICT, 209);
				}
			}

			const result = await prisma.$transaction(
				async (tx) => {
					// Logic here
					
					await tx.idempotencyKey.update({
						where: { key: idempotencyKey },
						data: { status: IdempotencyKeyType.SUCCESS },
					});
				},
				{
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
					maxWait: 5000,
					timeout: 10000,
				},
			);
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				await prisma.idempotencyKey.update({
					where: { key: idempotencyKey },
					data: { status: IdempotencyKeyType.FAILED },
				});
			}
			throw error;
		}
	}
}
