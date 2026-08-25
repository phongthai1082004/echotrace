import { inject, injectable } from 'tsyringe';
import { UUID } from 'crypto';
import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { IdempotencyKeyType } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { parseCreateOrderDTO, CreatePaymentLinkDto } from '@echotrace/shared'
import { CartService, ICartService } from '../cart/cart.service.js';
import { PaymentService } from '../../infrastructure/payment/payment.service.js'

export abstract class IOrderService {
	abstract createOrder(idempotencyKey: UUID, requestBody: string, userId: number): Promise<any>;
}

@injectable()
export class OrderService implements IOrderService {
	constructor(
		@inject(CartService) private cartService: ICartService,
		@inject('IPaymentService') private paymentService: PaymentService
	) {}
	async createOrder(idempotencyKey: UUID, requestBody: string, userId: number): Promise<any> {
		const createOrderDto = parseCreateOrderDTO(requestBody); 
		const cartQuote = await this.cartService.calculateCart(
			userId, 
			createOrderDto.paymentMethod,
			createOrderDto.couponCode,
			createOrderDto.items.map((book) => (book.bookId))
		);
		// const createPaymentLinkDto = new CreatePaymentLinkDto({
		// 	orderCode: this.createOrderCode,
		// 	amount: cartQuote.payNow,
		// 	description: null,
		// 	cancelUrl: dto.cancelUrl,
		// 	returnUrl: dto.returnUrl,
		// 	items: (dto.items || []) as PaymentLinkItem[],
		// 	buyerName: dto.buyerName,
		// 	buyerCompanyName: dto.buyerCompanyName,
		// 	buyerTaxCode: dto.buyerTaxCode || "",
		// 	buyerEmail: dto.buyerEmail,
		// 	buyerPhone: dto.buyerPhone,
		// 	buyerAddress: dto.buyerAddress,
		// 	invoice: {
		// 		buyerNotGetInvoice: dto.invoice?.buyerNotGetInvoice,
		// 		taxPercentage: dto.invoice?.taxPercentage as TaxPercentage
		// 	},
		// 	expiredAt: dto.expiredAt,			
		// });

		
		// Create Payment Link
		try {
			const existing = await prisma.idempotencyKey.findUnique({
				where: {
					key: idempotencyKey,
				},
			});
			if (existing) {
				if (existing.status == IdempotencyKeyType.SUCCESS) {
					
				} else if (existing.status == IdempotencyKeyType.FAILED) {

				} else if (existing.status == IdempotencyKeyType.PROCESSING) {
				}
			}

			const result = await prisma.$transaction(
				async (tx) => {
					// Create Order
					// this.paymentService.createPaymentLink()

					await tx.idempotencyKey.update({
						where: { key: idempotencyKey },
						data: { status: IdempotencyKeyType.SUCCESS },
					});
				},
				{
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
					maxWait: 5000,
					timeout: 10000,
				},
			);
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				await prisma.idempotencyKey.update({
					where: { key: idempotencyKey },
					data: { status: IdempotencyKeyType.FAILED },
				});
			}
			throw error;
		}
	}

	createOrderCode(): number {
		const now = new Date();
		const year = now.getFullYear().toString().slice(-2); // "26"
		const month = String(now.getMonth() + 1).padStart(2, '0'); // "08"
		const day = String(now.getDate()).padStart(2, '0'); // "25"
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		const milliseconds = String(now.getMilliseconds()).padStart(3, '0').slice(-1);
		return Number(`${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`);
	}
}
