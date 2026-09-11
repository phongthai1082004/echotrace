import 'reflect-metadata';
import { container } from 'tsyringe';
import { CacheService } from '../shared/cache/cache.service.js';
import { R2ImageService } from '../shared/r2/r2.service.js';
import { PaymentService } from '../modules/financial/payments/gateways/payment.service.js';
import { PayOSGateway } from '../modules/financial/payments/gateways/payos.service.js';
import { PayOS } from '@payos/node';
import { PrismaService } from '../../lib/db.service.js';

import { registerPdf } from '../modules/pdf/index.js';
import { registerAuthentication } from '../modules/authentication/index.js';
import { registerUser } from '../modules/user/index.js';
import { registerProduct } from '../modules/product/index.js';
import { registerFinancial } from '../modules/financial/index.js';
import { registerOrderCart } from '../modules/order-cart/index.js';
import { registerNotification } from '../modules/notification/index.js';

container.register('CacheService', { useValue: new CacheService() });
container.registerSingleton('IR2ImageService', R2ImageService);
container.registerSingleton('PrismaService', PrismaService);

let paymentService: PaymentService;
container.register('IPaymentService', {
	useFactory: (c) => {
		if (!paymentService) {
			const payOSGateway = c.resolve(PayOSGateway);
			paymentService = new PaymentService([payOSGateway]);
		}
		return paymentService;
	},
});

container.register('PayOS', {
	useValue: new PayOS({
		clientId: process.env.PAYOS_CLIENT_ID!,
		apiKey: process.env.PAYOS_API_KEY!,
		checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
	}),
});


[registerPdf, registerAuthentication, registerUser, registerProduct, registerFinancial, registerOrderCart, registerNotification].forEach((r) => r(container));

export { container };
