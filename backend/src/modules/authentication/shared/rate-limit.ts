import rateLimit from 'express-rate-limit';
import { ErrorCode } from '@echotrace/shared';

const E2E_BYPASS = process.env.E2E_NO_RATELIMIT === '1' && process.env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: ErrorCode.TOO_MANY_REQUEST },
	skip: () => E2E_BYPASS,
});

export const otpLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: ErrorCode.TOO_MANY_REQUEST },
	skip: () => E2E_BYPASS,
});

// cheap blanket guard for authed/admin routers — tighten per-route if noisy
export const apiLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: ErrorCode.TOO_MANY_REQUEST },
	skip: () => E2E_BYPASS,
});
