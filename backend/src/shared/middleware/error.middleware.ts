import { Request, Response, NextFunction } from 'express';
import { AppError } from './app.error.js';
import { ApiResponse } from './api.response.js';

// Known-noisy 401s (expired tab, unauthenticated polling): return 401 without log spam.
const SILENT_CODES = new Set(['AUTH_MISSING_TOKEN', 'AUTH_REFRESH_TOKEN_REVOKED']);

export const errorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
	let statusCode = 500;
	let errorCode = 'INTERNAL';
	let details: any = null;

	if (error instanceof AppError) {
		statusCode = error.statusCode;
		errorCode = error.errorCode;
		if (process.env.NODE_ENV !== 'production') details = error.details;
	} else if ((error as any)?.type === 'entity.too.large' || (error as any)?.status === 413) {
		// Body-parser limit hit: return 413 (not 500) so the client knows the payload is too large.
		statusCode = 413;
		errorCode = 'PAYLOAD_TOO_LARGE';
	}

	const t = (req as any).i18n?.t;
	const message = t ? t(`errors.${errorCode}`, { defaultValue: errorCode }) : errorCode;

	if (!SILENT_CODES.has(errorCode)) {
		console.error(`[Error] ${req.method} ${req.url} — ${errorCode} — ${statusCode}`);
		console.error(error.stack || error.message || error);
	}

	const response = ApiResponse.error(message, statusCode, details);
	return res.status(statusCode).json(response);
};
