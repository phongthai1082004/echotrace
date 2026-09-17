import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { WebhookProcessResult } from '@echotrace/shared';
import type {IPaymentWebhookService} from './payment.service.js';
import { PaymentService } from './gateways/payment.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';

@injectable()
export class PaymentController {
	constructor(
		@inject('IPaymentService') private readonly paymentService: PaymentService,
		@inject('IPaymentWebhookService') private readonly webhookService: IPaymentWebhookService,
	) {}

	payosWebhook = async (req: any, res: Response) => {
		let result: WebhookProcessResult;
		try {
			result = await this.paymentService.handleWebhook('PAYOS', req.body);
		} catch (e: any) {
			// Chữ ký sai ðể 400 ðể PayOS biðt endpoint bị giả mạo
			console.error('[payos-webhook] signature invalid:', e?.message || e, 'payload code:', req.body?.code);
			res.status(400).json(ApiResponse.error('Invalid webhook signature', 400));
			return;
		}
		try {
			await this.webhookService.processWebhook(result);
		} catch (e: any) {
			// Sig đúng mà lỗi nghiệp vụ → vẫn 200, chặn PayOS retry vô hạn
			console.error('[payos-webhook] process failed:', e?.message || e);
		}
		res.json(ApiResponse.message('Webhook received'));
	};
}
