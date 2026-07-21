import { CreatePaymentLinkDto, PaymentLinkResponse, WebhookProcessResult } from "../../dto/payment/payment.link.dto.js";
import { PaymentGateway } from '../../../enum/payment.enum.js'
import { IPaymentStrategy } from './payment.strategy.js';

export class PayOSGateway implements IPaymentStrategy {
    readonly providerName: PaymentGateway;
    constructor() {
        this.providerName = PaymentGateway.PAYOS;
    }
    createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse> {
        throw new Error("Method not implemented.");
    }
    handleWebhook(payload: any): Promise<WebhookProcessResult> {
        throw new Error("Method not implemented.");
    }

}