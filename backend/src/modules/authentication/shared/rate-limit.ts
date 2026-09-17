import rateLimit from 'express-rate-limit';
import { ErrorCode } from '@echotrace/shared';

// ponytail: E2E_NO_RATELIMIT=1 chỉ trong e2e (mọi login đi chung IP server-to-server)
const E2E_BYPASS = process.env.E2E_NO_RATELIMIT === '1';

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
});
