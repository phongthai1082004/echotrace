import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router } from 'express';
import { OtpController } from './otp.controller.js';
import { authLimiter, otpLimiter } from '../shared/rate-limit.js';

const router = Router();
const otp = container.resolve(OtpController);

router.post(
	'/send-otp',
	authLimiter,
	asyncHandler((req, res) => otp.sendOtp(req, res)),
);
router.post(
	'/verify-otp',
	otpLimiter,
	asyncHandler((req, res) => otp.verifyOtp(req, res)),
);

export default router;
