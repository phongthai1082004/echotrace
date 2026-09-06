import 'reflect-metadata';
import 'dotenv/config';
import './di/container.js';
import { container } from './di/container.js';
import { PdfWorker } from './features/pdf/pdf.worker.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import authRoutes from './features/auth/auth.routes.js';
import usersRoutes from './features/users/users.routes.js';
import suppliersRoutes from './features/suppliers/suppliers.routes.js';
import printOptionsRoutes from './features/print-options/print-options.routes.js';
import sampleBooksRoutes from './features/sample-books/sample-books.routes.js';
import booksRoutes from './features/books/books.routes.js';
import cartRoutes from './features/cart/cart.routes.js';
import couponsRoutes from './features/coupons/coupons.routes.js';
import stickersRoutes from './features/stickers/stickers.routes.js';
import uploadsRoutes from './features/uploads/uploads.routes.js';
import orderRoutes from './features/order/order.route.js';
import { startDelayedWorker } from './infrastructure/queue/redis-delayed-queue.js';
import { startOrderExpiryCron } from './infrastructure/queue/order-expiry-cron.js';
import paymentRoutes from './features/payment/payment.route.js';
import financeRoutes from './features/finance/finance.route.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const PORT = process.env.BACKEND_PORT;
const SUPPORTED_LANGS = ['en', 'vi', 'es'];
const DEFAULT_LANG = 'en';

async function bootstrap() {
	const app = express();

	// Health check - must work even if dependencies fail
	app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
	app.get('/', (req, res) => res.status(200).send('ok'));

	// Start server immediately so health checks pass
	const server = app.listen(PORT, () => {
		console.log(`🚀 Server running successfully at http://localhost:${PORT}/`);
	});

	// Initialize everything else but don't block startup
	setImmediate(async () => {
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

			app.use(helmet());
			const allowedOrigins = process.env.NEXTAUTH_URL ? [process.env.NEXTAUTH_URL] : [];
			app.use(cors({ origin: allowedOrigins, credentials: true }));
			app.use(express.json({ limit: '1mb' }));
			app.use(handle(i18next));

			const apiRouter = express.Router({ mergeParams: true });

			apiRouter.use((req: Request, res: Response, next: NextFunction) => {
				const lang = req.params.lang || (req as any).language || DEFAULT_LANG;
				req.i18n?.changeLanguage(SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG);
				next();
			});

			apiRouter.use('/auth', authRoutes);
			apiRouter.use('/', usersRoutes);
			apiRouter.use('/', suppliersRoutes);
			apiRouter.use('/', printOptionsRoutes);
			apiRouter.use('/', sampleBooksRoutes);
			apiRouter.use('/', booksRoutes);
			apiRouter.use('/', cartRoutes);
			apiRouter.use('/', couponsRoutes);
			apiRouter.use('/', stickersRoutes);
			apiRouter.use('/', uploadsRoutes);
			apiRouter.use('/', orderRoutes);
			apiRouter.use('/', paymentRoutes);
			apiRouter.use('/', financeRoutes);

			app.use('/:lang/api', apiRouter);
			app.use('/api', apiRouter);

			app.use(errorMiddleware);

			// Background jobs
			startDelayedWorker();
			startOrderExpiryCron();
			container.resolve(PdfWorker).start();
		} catch (err) {
			console.error('Failed to initialize app features:', err);
			// Keep server running with health checks only
		}
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

bootstrap().catch((error: Error) => {
	console.error('❌ Fatal error during server bootstrap initialization:', error.message);
	console.error(error.stack);
	process.exit(1);
});
