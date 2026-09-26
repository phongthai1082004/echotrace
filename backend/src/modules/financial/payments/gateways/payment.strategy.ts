import { CreatePaymentLinkDto, PaymentLinkResponse, WebhookProcessResult } from '@echotrace/shared';
import { PaymentGateway } from '@echotrace/shared';

export interface IPaymentStrategy {
	readonly providerName: PaymentGateway;
	createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse>;
	handleWebhook(payload: any): Promise<WebhookProcessResult>;
	refund(orderCode: number): Promise<boolean>;
	getPaymentStatus(orderCode: number): Promise<string | null>;
}
