import { Request, Response, NextFunction } from 'express';
import { AppError } from './app.error.js';
import { ApiResponse } from './api.response.js';

// ponytail: 401 auth noise (expired tab, polling without token) — trả 401 nhưng không spam log.
const SILENT_CODES = new Set(['AUTH_MISSING_TOKEN', 'AUTH_REFRESH_TOKEN_REVOKED']);

export const errorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
	let statusCode = 500;
	let errorCode = 'INTERNAL';
	let details: any = null;

	if (error instanceof AppError) {
		statusCode = error.statusCode;
		errorCode = error.errorCode;
		details = error.details;
	} else if ((error as any)?.type === 'entity.too.large' || (error as any)?.status === 413) {
		// ponytail: body-parser limit — trả 413 thay vì 500 để client hiểu là payload quá lớn.
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
