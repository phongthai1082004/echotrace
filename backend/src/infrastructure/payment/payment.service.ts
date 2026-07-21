import { PaymentGateway } from '../../../enum/payment.enum.js';
import { CreatePaymentLinkDto, PaymentLinkResponse, WebhookProcessResult } from '../../dto/payment/payment.link.dto.js';
import { IPaymentStrategy } from './payment.strategy.js'; 

export class PaymentService {
    private strategies: Map<PaymentGateway, IPaymentStrategy> = new Map();

    constructor(strategies: IPaymentStrategy[]) {
        strategies.forEach((strategy) => {
            this.strategies.set(strategy.providerName, strategy);
        })
    }
    private getStrategy(gateway: PaymentGateway): IPaymentStrategy {
        const strategy = this.strategies.get(gateway);
        if (!strategy) {
            throw new Error(`Payment gateway [${gateway}] is not supported.`);
        }
        return strategy;
    }
    async createPaymentLink(gateway: PaymentGateway, dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse> {
        const strategy = this.getStrategy(gateway);
        return await strategy.createPaymentLink(dto);
    }

    async handleWebhook(gateway: PaymentGateway, payload: any): Promise<WebhookProcessResult> {
        const strategy = this.getStrategy(gateway);
        return await strategy.handleWebhook(payload);
    }
}