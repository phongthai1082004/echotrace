import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import type {IOtpService} from './otp.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class OtpController {
	constructor(@inject('IOtpService') private readonly otpService: IOtpService) {}

	sendOtp = async (req: Request, res: Response) => {
		const { email } = req.body;
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(ErrorCode.AUTH_EMAIL_REQUIRED, 400);
		await this.otpService.sendOtp(email);
		res.json(ApiResponse.message('OTP sent to email'));
	};

	verifyOtp = async (req: Request, res: Response) => {
		const { email, otp, password } = req.body;
		if (!email || !otp || !password) throw new AppError(ErrorCode.AUTH_OTP_AND_PASSWORD_REQUIRED, 400);
		if (password.length < 6) throw new AppError(ErrorCode.AUTH_PASSWORD_MIN_LENGTH, 400);
		const result = await this.otpService.verifyOtpAndRegister(email, otp, password);
		res.status(201).json(ApiResponse.success(result));
	};
}
