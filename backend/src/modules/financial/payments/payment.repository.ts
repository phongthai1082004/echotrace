import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';

// Toàn bộ data access của PaymentWebhookService nằm trong 1 $transaction, nên repo chỉ cần
// expose `client` để service gọi `client.$transaction(...)`; các op trong callback giữ nguyên tx.*.
@injectable()
export class PaymentWebhookRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}
}
