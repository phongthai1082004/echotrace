import { PaymentGateway } from '@echotrace/shared';
import { CreatePaymentLinkDto, PaymentLinkResponse, WebhookProcessResult } from '@echotrace/shared';
import { IPaymentStrategy } from './payment.strategy.js';
import { injectable } from 'tsyringe';

export interface IPaymentService {
	createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse>;
	handleWebhook(gateway: PaymentGateway, payload: any): Promise<WebhookProcessResult>;
	refund(gateway: PaymentGateway, orderCode: number): Promise<boolean>;
	getPaymentStatus(gateway: PaymentGateway, orderCode: number): Promise<string | null>;
}

@injectable()
export class PaymentService implements IPaymentService {
	private strategies: IPaymentStrategy[];

	constructor(strategies: IPaymentStrategy[]) {
		this.strategies = strategies;
	}

	async createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse> {
		if (this.strategies.length === 0) {
			throw new Error('No payment gateways configured.');
		}

		let lastError: any;

		for (const strategy of this.strategies) {
			try {
				console.log(`Attempting to create payment link via gateway: [${strategy.providerName}]...`);
				const result = await strategy.createPaymentLink(dto);

				console.log(`Successfully created payment link via gateway: [${strategy.providerName}]`);
				return result;
			} catch (error) {
				lastError = error;
				console.warn(`Gateway [${strategy.providerName}] failed, switching to the next available gateway...`, error);
			}
		}

		throw new Error(`All payment gateways failed. Last error: ${lastError?.message || lastError}`);
	}

	async handleWebhook(gateway: PaymentGateway, payload: any): Promise<WebhookProcessResult> {
		const strategy = this.strategies.find((s) => s.providerName === gateway);
		if (!strategy) {
			throw new Error(`Payment gateway [${gateway}] is not supported.`);
		}
		return await strategy.handleWebhook(payload);
	}

	async refund(gateway: PaymentGateway, orderCode: number): Promise<boolean> {
		const strategy = this.strategies.find((s) => s.providerName === gateway);
		if (!strategy) throw new Error(`Payment gateway [${gateway}] is not supported.`);
		return await strategy.refund(orderCode);
	}

	async getPaymentStatus(gateway: PaymentGateway, orderCode: number): Promise<string | null> {
		const strategy = this.strategies.find((s) => s.providerName === gateway);
		if (!strategy) throw new Error(`Payment gateway [${gateway}] is not supported.`);
		return await strategy.getPaymentStatus(orderCode);
	}
}
