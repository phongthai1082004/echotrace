import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode, AuthResponseDTO, AuthMapper } from '@echotrace/shared';
import { AuthRepository } from '../repositories/auth.repository.js';
import { CacheService } from '../../../shared/cache/cache.service.js';
import { generateAccessToken, generateRefreshToken } from '../shared/token-issuer.js';
import { sendOtpEmail } from '../../notification/channels/mailer.js';

const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_FAIL_TTL_SECONDS = 60 * 60;

export interface IOtpService {
	sendOtp(email: string): Promise<void>;
	verifyOtpAndRegister(email: string, otp: string, password: string): Promise<AuthResponseDTO>;
}

@injectable()
export class OtpService implements IOtpService {
	constructor(
		@inject('AuthRepository') private authRepo: AuthRepository,
		@inject('CacheService') private cache: CacheService,
	) {}

	async sendOtp(email: string) {
		const existing = await this.authRepo.findActiveUserByEmail(email);

		if (existing) return;

		const otp = String(randomInt(100000, 1000000));
		const hashed = await bcrypt.hash(otp, 10);

		await this.authRepo.replaceOtpToken(email, hashed, new Date(Date.now() + OTP_TTL_MS));

		await sendOtpEmail(email, otp);
	}

	async verifyOtpAndRegister(email: string, otp: string, password: string) {
		const record = await this.authRepo.findValidOtp(email);
		if (!record) throw new AppError(ErrorCode.AUTH_OTP_NOT_REQUESTED, 400);
		if (Date.now() > record.expiresAt.getTime()) throw new AppError(ErrorCode.AUTH_OTP_EXPIRED, 400);

		const valid = await bcrypt.compare(otp, record.refreshToken);
		if (!valid) {
			const failKey = `otp_fail:${email}`;
			const fails = await this.cache.increment(failKey, OTP_FAIL_TTL_SECONDS);
			if (fails >= MAX_OTP_ATTEMPTS) {
				await this.authRepo.revokeToken(record.id);
				await this.cache.delete(failKey);
			}
			throw new AppError(ErrorCode.AUTH_INVALID_OTP, 400);
		}
		await this.cache.delete(`otp_fail:${email}`);

		await this.authRepo.revokeToken(record.id);

		const hashed = await bcrypt.hash(password, 10);
		const user = await this.authRepo.createPasswordUser(email, hashed);

		return AuthMapper.toAuthResponse(user, generateAccessToken(String(user.id), user.role), await generateRefreshToken(this.authRepo, String(user.id)));
	}
}
