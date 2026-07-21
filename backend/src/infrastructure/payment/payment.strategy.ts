import { CreatePaymentLinkDto, PaymentLinkResponse, WebhookProcessResult } from '../../dto/payment/payment.link.dto.js'
import { PaymentGateway } from '../../../enum/payment.enum.js'

export interface IPaymentStrategy {
  readonly providerName: PaymentGateway;
  createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse>;
  handleWebhook(payload: any): Promise<WebhookProcessResult>;
}