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
            ...(dto.buyerTaxCode ? { buyerTaxCode: dto.buyerTaxCode } : {}), // PayOS từ chối chuỗi rỗng
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
	async getPaymentStatus(orderCode: number): Promise<string | null> {
		try {
			const pl = (await this.payOS.paymentRequests.get(orderCode)) as any;
			return pl?.status ?? null;
		} catch {
			return null;
		}
	}

	async handleWebhook(payload: any): Promise<WebhookProcessResult> {
		// SDK verify() ném lỗi nếu chữ ký sai
		const data = await this.payOS.webhooks.verify(payload);
		const status =
			payload.code === '00' && payload.success !== false
				? TransactionStatus.SUCCESS
				: payload.code === '01'
					? TransactionStatus.CANCELLED
					: TransactionStatus.FAILED;
		return {
			orderCode: String(data.orderCode),
			gateway: this.providerName,
			gatewayTransactionCode: data.paymentLinkId,
			amount: data.amount,
			status,
			transactionTime: new Date(data.transactionDateTime),
			bankAccount: data.accountNumber,
			content: data.description,
			reference: data.reference,
			rawPayload: payload,
			isValidSignature: true,
		};
	}

	async refund(orderCode: number): Promise<boolean> {
		try {
			await this.payOS.paymentRequests.cancel(orderCode, 'refund by admin');
			return true;
		} catch (e: any) {
			// ponytail: already paid -> SDK can't auto-refund; mark manual in caller
			console.warn('[payos] refund(cancel) failed:', e?.message || e);
			return false;
		}
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
