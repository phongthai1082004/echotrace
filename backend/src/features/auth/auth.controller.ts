import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { IAuthService } from './auth.service.js';
import { ApiResponse } from '../../middleware/api.response.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { AuthRequest } from '../../middleware/auth.middleware.js';

@injectable()
export class AuthController {
	constructor(@inject('IAuthService') private readonly authService: IAuthService) {}

	googleLogin = async (req: Request, res: Response) => {
		const { idToken } = req.body;
		if (!idToken) throw new AppError(ErrorCode.AUTH_ID_TOKEN_REQUIRED, 400);
		const result = await this.authService.loginWithGoogle(idToken);
		res.json(ApiResponse.success(result));
	};

	sendOtp = async (req: Request, res: Response) => {
		const { email } = req.body;
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(ErrorCode.AUTH_EMAIL_REQUIRED, 400);
		await this.authService.sendOtp(email);
		res.json(ApiResponse.message('OTP sent to email'));
	};

	verifyOtp = async (req: Request, res: Response) => {
		const { email, otp, password } = req.body;
		if (!email || !otp || !password) throw new AppError(ErrorCode.AUTH_OTP_AND_PASSWORD_REQUIRED, 400);
		if (password.length < 6) throw new AppError(ErrorCode.AUTH_PASSWORD_MIN_LENGTH, 400);
		const result = await this.authService.verifyOtpAndRegister(email, otp, password);
		res.status(201).json(ApiResponse.success(result));
	};

	login = async (req: Request, res: Response) => {
		const { email, password } = req.body;
		if (!email || !password) throw new AppError(ErrorCode.AUTH_EMAIL_PASSWORD_REQUIRED, 400);
		const result = await this.authService.login(email, password);
		res.json(ApiResponse.success(result));
	};

	logout = async (req: AuthRequest, res: Response) => {
		if (!req.userId) throw new AppError(ErrorCode.AUTH_NOT_AUTHENTICATED, 401);
		await this.authService.logout(req.userId);
		res.json(ApiResponse.message('logged out'));
	};

	refresh = async (req: Request, res: Response) => {
		const { refreshToken } = req.body;
		if (!refreshToken) throw new AppError(ErrorCode.AUTH_REFRESH_TOKEN_REQUIRED, 400);
		const result = await this.authService.refresh(refreshToken);
		res.json(ApiResponse.success(result));
	};
}
