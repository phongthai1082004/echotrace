import { injectable, inject } from 'tsyringe';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode, TokenType, AuthResponseDTO, AuthMapper } from '@echotrace/shared';
import { sendOtpEmail } from '../../../lib/mailer.js';
import { AuthRepository } from './auth.repository.js';
import { CacheService } from '../../infrastructure/cache/cache.service.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MAX_OTP_ATTEMPTS = 5;
// OTP fail counter TTL matches OTP validity window (24 h) so the key self-expires.
const OTP_FAIL_TTL_SECONDS = 24 * 60 * 60;

export interface IAuthService {
	loginWithGoogle(idToken: string): Promise<AuthResponseDTO>;
	sendOtp(email: string): Promise<void>;
	verifyOtpAndRegister(email: string, otp: string, password: string): Promise<AuthResponseDTO>;
	login(email: string, password: string): Promise<AuthResponseDTO>;
	logout(userId: string): Promise<void>;
	refresh(token: string): Promise<{ accessToken: string; refreshToken: string }>;
}

@injectable()
export class AuthService implements IAuthService {
	constructor(
		@inject('AuthRepository') private authRepo: AuthRepository,
		@inject('CacheService') private cache: CacheService,
	) {}

	async loginWithGoogle(idToken: string) {
		const ticket = await googleClient.verifyIdToken({
			idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		if (!payload?.email) throw new AppError(ErrorCode.AUTH_INVALID_GOOGLE_TOKEN, 401);

		let user = await this.authRepo.findUserByGoogleOrEmail(payload.email, payload.sub);
		if (!user) {
			user = await this.authRepo.createGoogleUser({
				email: payload.email,
				name: payload.name || 'User',
				googleId: payload.sub,
				avatar: payload.picture,
			});
		} else if (user.isDelete) {
			throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);
		}
		return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id), user.role), await this.generateRefreshToken(String(user.id)));
	}

	async sendOtp(email: string) {
		const existing = await this.authRepo.findActiveUserByEmail(email);

		if (existing) return;

		const otp = String(randomInt(100000, 1000000));
		const hashed = await bcrypt.hash(otp, 10);

		// ponytail: atomic replace — delete + create in one transaction so a crash between
		// the two ops cannot leave the user with no valid OTP.
		await this.authRepo.replaceOtpToken(email, hashed, new Date(Date.now() + 24 * 60 * 60 * 1000));

		await sendOtpEmail(email, otp);
	}

	async verifyOtpAndRegister(email: string, otp: string, password: string) {
		const record = await this.authRepo.findValidOtp(email);
		if (!record) throw new AppError(ErrorCode.AUTH_OTP_NOT_REQUESTED, 400);
		if (Date.now() > record.expiresAt.getTime()) throw new AppError(ErrorCode.AUTH_OTP_EXPIRED, 400);

		const valid = await bcrypt.compare(otp, record.refreshToken);
		if (!valid) {
			// ponytail: counter is keyed by token id and stored in Redis so all instances
			// share the same count. TTL matches OTP validity (24 h); key self-expires with
			// the OTP. fail-open when Redis is down (Infinity > MAX → revoke immediately).
			const failKey = `otp_fail:${record.id}`;
			const fails = await this.cache.increment(failKey, OTP_FAIL_TTL_SECONDS);
			if (fails >= MAX_OTP_ATTEMPTS) {
				await this.authRepo.revokeToken(record.id);
				await this.cache.delete(failKey);
			}
			throw new AppError(ErrorCode.AUTH_INVALID_OTP, 400);
		}
		// Clear fail counter on success before revoking token
		await this.cache.delete(`otp_fail:${record.id}`);

		await this.authRepo.revokeToken(record.id);

		const hashed = await bcrypt.hash(password, 10);
		const user = await this.authRepo.createPasswordUser(email, hashed);

		return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id), user.role), await this.generateRefreshToken(String(user.id)));
	}

	async login(email: string, password: string) {
		const user = await this.authRepo.findActiveUserByEmailFull(email);
		if (!user || !user.password) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);
		if (user.isDelete) throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);

		return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id), user.role), await this.generateRefreshToken(String(user.id)));
	}

	async logout(userId: string) {
		await this.authRepo.revokeSessionTokens(parseInt(userId));
	}

	async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
		let payload: { userId: string };
		try {
			payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
		} catch {
			throw new AppError(ErrorCode.AUTH_INVALID_REFRESH_TOKEN, 401);
		}

		const existing = await this.authRepo.findSessionByToken(token);
		if (!existing) throw new AppError(ErrorCode.AUTH_REFRESH_TOKEN_REVOKED, 401);

		const user = await this.authRepo.findUserByIdRole(parseInt(payload.userId));
		if (!user || user.isDelete) throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);

		// ponytail: rotate this specific token only — delete the old row and issue a new one.
		// Other devices keep their own session tokens alive (multi-device support).
		const accessToken = this.generateAccessToken(payload.userId, user.role);
		const rt = jwt.sign({ userId: payload.userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
		await this.authRepo.rotateSessionToken(
			existing.id,
			parseInt(payload.userId),
			rt,
			new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		);
		return { accessToken, refreshToken: rt };
	}

	private generateAccessToken(userId: string, role: string) {
		return jwt.sign({ userId, role }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '1h' });
	}

	private async generateRefreshToken(userId: string) {
		// ponytail: each login creates a new session token independently.
		// Other existing sessions (other devices) are not invalidated.
		const rt = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
		await this.authRepo.createSessionToken(parseInt(userId), rt, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
		return rt;
	}
}
