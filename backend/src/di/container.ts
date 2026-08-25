import 'reflect-metadata';
import { container } from 'tsyringe';
import { BaseService } from '../utils/base.service.js';
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
import { CouponService } from '../features/coupons/coupons.service.js';
import { SampleBookService } from '../features/sample-books/sample-books.service.js';
import { PaymentService } from '../infrastructure/payment/payment.service.js';
import { PayOSGateway } from '../infrastructure/payment/payos.service.js';
import { PayOS } from '@payos/node';

container.register('UserBaseService', { useValue: new BaseService<any>(prisma.user) });
container.register('CacheService', { useValue: new CacheService() });
container.register('UserImageBaseService', { useValue: new BaseService<any>(prisma.userImage) });
container.register('SupplierBaseService', { useValue: new BaseService<any>(prisma.supplier) });
container.register('PrintOptionBaseService', { useValue: new BaseService<any>(prisma.printOption) });
container.register('SupplierPrintOptionBaseService', { useValue: new BaseService<any>(prisma.supplierPrintOption) });
container.register('DecorAssetBaseService', { useValue: new BaseService<any>(prisma.decorAsset) });
container.register('CartBaseService', { useValue: new BaseService<any>(prisma.cart) });
container.register('OrderBaseService', { useValue: new BaseService<any>(prisma.order) });

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
