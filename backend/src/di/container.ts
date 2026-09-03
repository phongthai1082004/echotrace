import 'reflect-metadata';
import { container } from 'tsyringe';
import { CacheService } from '../infrastructure/cache/cache.service.js';
import { OptionCatalogCacheService } from '../infrastructure/cache/option-catalog.cache.service.js';
import { SampleBookCacheService } from '../infrastructure/cache/sample-book.cache.service.js';
import { R2ImageService } from '../infrastructure/r2/r2.service.js';
import { PaymentService } from '../infrastructure/payment/payment.service.js';
import { PayOSGateway } from '../infrastructure/payment/payos.service.js';
import { PayOS } from '@payos/node';
import { EmailService } from '../features/email/email.service.js';
import { FabricRenderer } from '../features/pdf/fabric.renderer.js';
import { R2FileService } from '../features/pdf/r2-file.service.js';
import { PdfService } from '../features/pdf/pdf.service.js';
import { PdfRepository } from '../features/pdf/pdf.repository.js';
import { DbPdfQueue } from '../features/pdf/pdf.queue.js';
import { PdfWorker } from '../features/pdf/pdf.worker.js';
import { DecorAssetRepository } from '../features/stickers/stickers.repository.js';
import { PrismaService } from '../../lib/db.service.js';

import { register as registerAuth } from '../features/auth/index.js';
import { register as registerBooks } from '../features/books/index.js';
import { register as registerUsers } from '../features/users/index.js';
import { register as registerUploads } from '../features/uploads/index.js';
import { register as registerSuppliers } from '../features/suppliers/index.js';
import { register as registerPrintOptions } from '../features/print-options/index.js';
import { register as registerCart } from '../features/cart/index.js';
import { register as registerOrder } from '../features/order/index.js';
import { register as registerCoupons } from '../features/coupons/index.js';
import { register as registerSampleBooks, StockService } from '../features/sample-books/index.js';
import { register as registerPayment } from '../features/payment/index.js';
import { register as registerFinance } from '../features/finance/index.js';

// Infrastructure, pdf (no barrel) and email (no barrel) keep registration here.
container.register('CacheService', { useValue: new CacheService() });
container.registerSingleton('IR2ImageService', R2ImageService);
container.registerSingleton('IOptionCatalogCacheService', OptionCatalogCacheService);
container.registerSingleton('ISampleBookCacheService', SampleBookCacheService);
container.registerSingleton('IStockService', StockService);
container.registerSingleton('IOrderPdfRenderer', FabricRenderer);
container.registerSingleton('IR2FileService', R2FileService);
container.registerSingleton('PdfService', PdfService);
container.registerSingleton('PdfRepository', PdfRepository);
container.registerSingleton('IPdfQueue', DbPdfQueue);
container.registerSingleton('PdfWorker', PdfWorker);
container.registerSingleton('DecorAssetRepository', DecorAssetRepository);
container.registerSingleton('IEmailService', EmailService);
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


[registerAuth, registerBooks, registerUsers, registerUploads, registerSuppliers,
	registerPrintOptions, registerCart, registerOrder, registerCoupons,
	registerSampleBooks, registerPayment, registerFinance].forEach((r) => r(container));

export { container };
