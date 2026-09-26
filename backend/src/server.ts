import 'reflect-metadata';
import 'dotenv/config';
import './di/container.js';
import { container } from './di/container.js';
import { PdfWorker } from './modules/pdf/pipeline/pdf.worker.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import passwordRoutes from './modules/authentication/password/password.routes.js';
import sessionsRoutes from './modules/authentication/sessions/sessions.routes.js';
import otpRoutes from './modules/authentication/otp/otp.routes.js';
import oauthRoutes from './modules/authentication/oauth/oauth.routes.js';
import profileRoutes from './modules/user/profile/profile.routes.js';
import directoryRoutes from './modules/user/directory/directory.routes.js';
import suppliersRoutes from './modules/financial/suppliers/suppliers.routes.js';
import printOptionsRoutes from './modules/product/print-options/print-options.routes.js';
import sampleBooksRoutes from './modules/product/sample-books/sample-books.routes.js';
import booksRoutes from './modules/product/books/books.routes.js';
import cartRoutes from './modules/order-cart/cart/cart.routes.js';
import couponsRoutes from './modules/order-cart/coupons/coupons.routes.js';
import stickersRoutes from './modules/product/stickers/stickers.routes.js';
import uploadsRoutes from './modules/product/uploads/uploads.routes.js';
import orderRoutes from './modules/order-cart/routes/order.route.js';
import { startDelayedWorker } from './modules/order-cart/queue/redis-delayed-queue.js';
import { startOrderExpiryCron } from './modules/order-cart/queue/order-expiry-cron.js';
import paymentRoutes from './modules/financial/payments/payment.route.js';
import financeRoutes from './modules/financial/ledger/finance.route.js';
import notificationRoutes from './modules/notification/notification.routes.js';import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { healthRoutes } from './shared/health/health.routes.js';
import maintenanceRoutes from './shared/maintenance/maintenance.routes.js';
import { maintenanceMiddleware } from './shared/middleware/maintenance.middleware.js';

const PORT = process.env.BACKEND_PORT;
const SUPPORTED_LANGS = ['en', 'vi', 'es'];
const DEFAULT_LANG = 'en';

// thật mà không listen/không chạy workers. opts.jobs=false trong test.
export async function buildApp(opts: { jobs?: boolean } = {}) {
	const app = express();

	// behind nginx (1 hop) — lets express-rate-limit see real client IPs from X-Forwarded-For
	app.set('trust proxy', 1);

	// Health check - must work even if dependencies fail
	app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
	app.get('/', (req, res) => res.status(200).send('ok'));

	try {
		await i18next
			.use(Backend)
			.use(LanguageDetector)
			.init({
				fallbackLng: DEFAULT_LANG,
				supportedLngs: SUPPORTED_LANGS,
				preload: SUPPORTED_LANGS,
				backend: {
					loadPath: './locales/{{lng}}.json',
				},
			});
	} catch {
		/* i18n files missing in test cwd — validator falls back to raw messages */
	}

			app.use(helmet());
			const allowedOrigins = process.env.NEXTAUTH_URL ? [process.env.NEXTAUTH_URL] : [];
			app.use(cors({ origin: allowedOrigins, credentials: true }));
		app.use(express.json({ limit: '1mb' }));
		// (middleware pin TS khác root) nên structural check báo thừa; runtime cùng 1 object.
		app.use(handle(i18next as unknown as Parameters<typeof handle>[0]));
		// Đăng ký trước routers để bao hết; /health nông đăng ký sớm hơn nên luôn sống.
		app.use(maintenanceMiddleware);

		app.use('/health', healthRoutes); // deep check (DB + Redis); shallow /health handled above

			const apiRouter = express.Router({ mergeParams: true });

			apiRouter.use((req: Request, res: Response, next: NextFunction) => {
				const lang = req.params.lang || (req as any).language || DEFAULT_LANG;
				req.i18n?.changeLanguage(SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG);
				next();
			});

			// Webhook MUST be mounted first: several routers call router.use(authGuard()) and are
			// mounted on '/' — a later mount would 401 the PayOS webhook before it matches.
			apiRouter.use('/', paymentRoutes);
			// cùng lý do webhook, mount sớm kẻo dính authGuard('/') của router khác.
			apiRouter.use('/', maintenanceRoutes);

apiRouter.use('/auth', passwordRoutes);
apiRouter.use('/auth', sessionsRoutes);
apiRouter.use('/auth', otpRoutes);
apiRouter.use('/auth', oauthRoutes);
apiRouter.use('/', profileRoutes);
apiRouter.use('/', directoryRoutes);
			apiRouter.use('/', suppliersRoutes);
			apiRouter.use('/', printOptionsRoutes);
			apiRouter.use('/', sampleBooksRoutes);
			apiRouter.use('/', booksRoutes);
			apiRouter.use('/', cartRoutes);
			apiRouter.use('/', couponsRoutes);
			apiRouter.use('/', stickersRoutes);
			apiRouter.use('/', uploadsRoutes);
			apiRouter.use('/', orderRoutes);
			apiRouter.use('/', financeRoutes);
			apiRouter.use('/', notificationRoutes);

			app.use('/:lang/api', apiRouter);
			app.use('/api', apiRouter);

			app.use(errorMiddleware);

			if (opts.jobs ?? true) {
				// Background jobs (skipped in integration tests)
				startDelayedWorker();
				startOrderExpiryCron();
				container.resolve(PdfWorker).start();

				// Register webhook URL with PayOS (idempotent). Re-run on deploy or URL change,
				// otherwise payment notifications are never sent. Requires WEBHOOK_URL publicly reachable.
				if (process.env.WEBHOOK_URL) {
					const { PayOS } = await import('@payos/node');
					const payos = new PayOS({
						clientId: process.env.PAYOS_CLIENT_ID!,
						apiKey: process.env.PAYOS_API_KEY!,
						checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
					});
					try {
						await payos.webhooks.confirm(process.env.WEBHOOK_URL);
						console.log('? PayOS webhook registered:', process.env.WEBHOOK_URL);
					} catch (e: any) {
						console.error('? PayOS webhook registration failed:', e?.message || e);
					}
				} else {
					console.warn('? WEBHOOK_URL not set - PayOS webhooks will not be delivered');
				}
			}
	return app;
}

async function bootstrap() {
	const app = await buildApp();

	// Start server immediately so health checks pass
	const server = app.listen(PORT, () => {
		console.log(`🚀 Server running successfully at http://localhost:${PORT}/`);
	});

	server.on('error', (error: Error) => {
		console.error('❌ Server runtime error:', error.message);
	});

	process.on('unhandledRejection', (reason: unknown) => {
		console.error('💥 UNHANDLED REJECTION:', reason);
	});

	process.on('uncaughtException', (error: Error) => {
		console.error('💥 UNCAUGHT EXCEPTION:', error);
		// Don't exit - allow health checks to continue
	});
}

if (process.env.JEST_WORKER_ID === undefined) {
	bootstrap().catch((error: Error) => {
		console.error('❌ Fatal error during server bootstrap initialization:', error.message);
		console.error(error.stack);
		process.exit(1);
	});
}
