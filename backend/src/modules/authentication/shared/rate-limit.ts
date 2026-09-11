import rateLimit from 'express-rate-limit';
import { ErrorCode } from '@echotrace/shared';

export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: ErrorCode.TOO_MANY_REQUEST },
});

export const otpLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: ErrorCode.TOO_MANY_REQUEST },
});
