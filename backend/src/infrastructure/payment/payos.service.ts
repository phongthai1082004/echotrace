import { CreatePaymentLinkDto, PaymentLinkResponse, WebhookProcessResult, TransactionStatus } from '@echotrace/shared';
import { PaymentGateway } from '@echotrace/shared';
import { IPaymentStrategy } from './payment.strategy.js';
import { inject, injectable } from 'tsyringe';
import { PaymentLinkItem, PayOS, TaxPercentage } from '@payos/node';
import * as crypto from 'crypto';

@injectable()
export class PayOSGateway implements IPaymentStrategy {
	readonly providerName: PaymentGateway;
	constructor(@inject('PayOS') private payOS: PayOS) {
		this.providerName = PaymentGateway.PAYOS;
	}
	async createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse> {
		const paymentLink = await this.payOS.paymentRequests.create({
            orderCode: dto.orderCode,
            amount: dto.amount,
            description: dto.description,
            cancelUrl: dto.cancelUrl,
            returnUrl: dto.returnUrl,
            items: (dto.items || []) as PaymentLinkItem[],
            buyerName: dto.buyerName,
            buyerCompanyName: dto.buyerCompanyName,
            buyerTaxCode: dto.buyerTaxCode || "",
            buyerEmail: dto.buyerEmail,
            buyerPhone: dto.buyerPhone,
            buyerAddress: dto.buyerAddress,
            invoice: {
                buyerNotGetInvoice: dto.invoice?.buyerNotGetInvoice,
                taxPercentage: dto.invoice?.taxPercentage as TaxPercentage
            },
            expiredAt: dto.expiredAt,
            signature: this.generatePayOSSignature({
                amount: dto.amount,
                cancelUrl: dto.cancelUrl,
                description: dto.description,
                orderCode: dto.orderCode,
                returnUrl: dto.returnUrl,
            }, process.env.PAYOS_CHECKSUM_KEY!)
        });

		return {
            gateway: this.providerName,
            gatewayTransactionCode: String(paymentLink.paymentLinkId), 
            amount: paymentLink.amount,
            status: TransactionStatus.PENDING,
            checkoutUrl: paymentLink.checkoutUrl,
            qrCode: paymentLink.qrCode,
            bankAccount: paymentLink.accountNumber,
            bankBin: paymentLink.bin,
            accountName: paymentLink.accountName,
            content: paymentLink.description,
            raw: paymentLink, 
        };
	}
	handleWebhook(payload: any): Promise<WebhookProcessResult> {
		throw new Error('Method not implemented.');
	}

    generatePayOSSignature(
        data: {
            amount: number;
            cancelUrl: string;
            description: string;
            orderCode: number;
            returnUrl: string;
        },
        checksumKey: string
    ): string {
        const sortedData = {
            amount: data.amount,
            cancelUrl: data.cancelUrl,
            description: data.description,
            orderCode: data.orderCode,
            returnUrl: data.returnUrl,
        };

        const dataString = Object.keys(sortedData)
            .sort() 
            .map((key) => `${key}=${sortedData[key as keyof typeof sortedData]}`)
            .join('&');

        const signature = crypto
            .createHmac('sha256', checksumKey)
            .update(dataString)
            .digest('hex');

        return signature;
    }
}
