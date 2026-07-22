import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "../errors/error-codes.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

const authService = new AuthService();

export class AuthController {
  async googleLogin(req: Request, res: Response) {
    const { idToken } = req.body;
    if (!idToken) throw new AppError(ErrorCode.AUTH_ID_TOKEN_REQUIRED, 400);
    const result = await authService.loginWithGoogle(idToken);
    res.json(ApiResponse.success(result));
  }

  async sendOtp(req: Request, res: Response) {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(ErrorCode.AUTH_EMAIL_REQUIRED, 400);
    await authService.sendOtp(email);
    res.json(ApiResponse.message("OTP sent to email"));
  }

  async verifyOtp(req: Request, res: Response) {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) throw new AppError(ErrorCode.AUTH_OTP_AND_PASSWORD_REQUIRED, 400);
    if (password.length < 6) throw new AppError(ErrorCode.AUTH_PASSWORD_MIN_LENGTH, 400);
    const result = await authService.verifyOtpAndRegister(email, otp, password);
    res.status(201).json(ApiResponse.success(result));
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(ErrorCode.AUTH_EMAIL_PASSWORD_REQUIRED, 400);
    const result = await authService.login(email, password);
    res.json(ApiResponse.success(result));
  }

  async logout(req: AuthRequest, res: Response) {
    if (!req.userId) throw new AppError(ErrorCode.AUTH_NOT_AUTHENTICATED, 401);
    await authService.logout(req.userId);
    res.json(ApiResponse.message("logged out"));
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError(ErrorCode.AUTH_REFRESH_TOKEN_REQUIRED, 400);
    const result = await authService.refresh(refreshToken);
    res.json(ApiResponse.success(result));
  }
}
