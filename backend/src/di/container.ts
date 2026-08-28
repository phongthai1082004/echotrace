import 'reflect-metadata';
import { container } from 'tsyringe';
import { prisma } from '../../lib/prisma.js';
import { CacheService } from '../infrastructure/cache/cache.service.js';
import { OptionCatalogCacheService } from '../infrastructure/cache/option-catalog.cache.service.js';
import { SampleBookCacheService } from '../infrastructure/cache/sample-book.cache.service.js';
import { R2ImageService } from '../infrastructure/r2/r2.service.js';
import { AuthService } from '../features/auth/auth.service.js';
import { BookService } from '../features/books/books.service.js';
import { UserService } from '../features/users/users.service.js';
import { UserImageService } from '../features/uploads/user-images.service.js';
import { SupplierService } from '../features/suppliers/suppliers.service.js';
import { PrintOptionService } from '../features/print-options/print-options.service.js';
import { CartService } from '../features/cart/cart.service.js';
import { OrderService } from '../features/order/order.service.js';
import { OrderFinanceService } from '../features/order/order-finance.service.js';
import { CouponService } from '../features/coupons/coupons.service.js';
import { SampleBookService } from '../features/sample-books/sample-books.service.js';
import { PaymentService } from '../infrastructure/payment/payment.service.js';
import { PayOSGateway } from '../infrastructure/payment/payos.service.js';
import { PayOS } from '@payos/node';
import { PaymentWebhookService } from '../features/payment/payment.service.js';
import { EmailService } from '../features/email/email.service.js';
import { FinanceService } from '../features/finance/finance.service.js';

container.register('CacheService', { useValue: new CacheService() });

container.registerSingleton('IR2ImageService', R2ImageService);
container.registerSingleton('IAuthService', AuthService);
container.registerSingleton('IBookService', BookService);
container.registerSingleton('IUserService', UserService);
container.registerSingleton('IUserImageService', UserImageService);
container.registerSingleton('ISupplierService', SupplierService);
container.registerSingleton('IPrintOptionService', PrintOptionService);
container.registerSingleton('ICartService', CartService);
container.registerSingleton('ICouponService', CouponService);
container.registerSingleton('ISampleBookService', SampleBookService);
container.registerSingleton('IOptionCatalogCacheService', OptionCatalogCacheService);
container.registerSingleton('ISampleBookCacheService', SampleBookCacheService);
container.registerSingleton('IOrderService', OrderService);
container.registerSingleton('IOrderFinanceService', OrderFinanceService);
container.registerSingleton('IPaymentWebhookService', PaymentWebhookService);
container.registerSingleton('IEmailService', EmailService);
container.registerSingleton('IFinanceService', FinanceService);

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

export { container };
