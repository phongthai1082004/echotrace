import { CreatePaymentLinkDto, PaymentLinkResponse, WebhookProcessResult } from '@echotrace/shared';
import { PaymentGateway } from '@echotrace/shared';

export interface IPaymentStrategy {
	readonly providerName: PaymentGateway;
	createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse>;
	handleWebhook(payload: any): Promise<WebhookProcessResult>;
	// ponytail: PayOS SDK only exposes cancel for pending links; paid refunds are manual on PayOS side
	refund(orderCode: number): Promise<boolean>;
	// ponytail: get() trả status thật từ PayOS — dùng cho client verify khi webhook không tới được (localhost)
	getPaymentStatus(orderCode: number): Promise<string | null>;
}
