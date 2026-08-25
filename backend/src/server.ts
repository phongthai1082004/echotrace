import 'reflect-metadata';
import 'dotenv/config';
import './di/container.js';
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
import { errorMiddleware } from './middleware/error.middleware.js';

const PORT = process.env.BACKEND_PORT;
const SUPPORTED_LANGS = ['en', 'vi', 'es'];
const DEFAULT_LANG = 'en';

async function bootstrap() {
	const app = express();

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
	app.use(cors({ origin: process.env.NEXTAUTH_URL, credentials: true }));
	app.use(express.json({ limit: '10mb' }));
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

	app.use('/:lang/api', apiRouter);
	app.use('/api', apiRouter);

	app.use(errorMiddleware);

	const server = app.listen(PORT, () => {
		console.log(`🚀 Server running successfully at http://localhost:${PORT}/`);
	});

	server.on('error', (error: Error) => {
		console.error('❌ Server runtime error encountered:', error.message);
		console.error(error.stack);
	});

	process.on('unhandledRejection', (reason: unknown) => {
		console.error('💥 UNHANDLED PROMISE REJECTION! Shutting down server...', reason);
		server.close(() => process.exit(1));
	});

	process.on('uncaughtException', (error: Error) => {
		console.error('💥 UNCAUGHT EXCEPTION! Shutting down server...', error);
		process.exit(1);
	});
}

bootstrap().catch((error: Error) => {
	console.error('❌ Fatal error during server bootstrap initialization:', error.message);
	console.error(error.stack);
	process.exit(1);
});
