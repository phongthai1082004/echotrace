import { injectable } from 'tsyringe';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { sendOtpEmail } from '../../../lib/mailer.js';
import { TokenType } from '@echotrace/shared';
import { AuthResponseDTO, AuthMapper } from '@echotrace/shared';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// WEB-005 fix: đếm lần sai theo token record — sai 5 lần thì revoke OTP.
// ponytail: in-memory, restart là reset — rate limiter ở route vẫn chặn tầng ngoài.
const otpFailCounts = new Map<number, number>();
const MAX_OTP_ATTEMPTS = 5;

export abstract class IAuthService {
	abstract loginWithGoogle(idToken: string): Promise<AuthResponseDTO>;
	abstract sendOtp(email: string): Promise<void>;
	abstract verifyOtpAndRegister(email: string, otp: string, password: string): Promise<AuthResponseDTO>;
	abstract login(email: string, password: string): Promise<AuthResponseDTO>;
	abstract logout(userId: string): Promise<void>;
	abstract refresh(token: string): Promise<{ accessToken: string }>;
}

@injectable()
export class AuthService extends IAuthService {
	async loginWithGoogle(idToken: string) {
		const ticket = await googleClient.verifyIdToken({
			idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		if (!payload?.email) throw new AppError(ErrorCode.AUTH_INVALID_GOOGLE_TOKEN, 401);

		let user = await prisma.user.findFirst({
			where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
		});
		if (!user) {
			user = await prisma.user.create({
				data: {
					email: payload.email,
					name: payload.name || 'User',
					googleId: payload.sub,
					avatar: payload.picture,
				},
			});
		} else if (user.isDelete) {
			throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);
		}
		return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id), user.role), await this.generateRefreshToken(String(user.id)));
	}

	async sendOtp(email: string) {
		const existing = await prisma.user.findFirst({
			where: { email, isDelete: false },
		});
		// WEB-003 fix: im lặng thay vì 409 — không lộ email nào đã đăng ký
		if (existing) return;

		const otp = String(Math.floor(100000 + Math.random() * 900000));
		const hashed = await bcrypt.hash(otp, 10);

		await prisma.token.deleteMany({ where: { email, tokenType: TokenType.OTP } });

		await prisma.token.create({
			data: {
				email,
				refreshToken: hashed,
				tokenType: TokenType.OTP,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			},
		});

		await sendOtpEmail(email, otp);
	}

	async verifyOtpAndRegister(email: string, otp: string, password: string) {
		const record = await prisma.token.findFirst({
			where: { email, tokenType: TokenType.OTP, isRevoked: false },
		});
		if (!record) throw new AppError(ErrorCode.AUTH_OTP_NOT_REQUESTED, 400);
		if (Date.now() > record.expiresAt.getTime()) throw new AppError(ErrorCode.AUTH_OTP_EXPIRED, 400);

		const valid = await bcrypt.compare(otp, record.refreshToken);
		if (!valid) {
			const fails = (otpFailCounts.get(record.id) ?? 0) + 1;
			if (fails >= MAX_OTP_ATTEMPTS) {
				await prisma.token.update({ where: { id: record.id }, data: { isRevoked: true } });
				otpFailCounts.delete(record.id);
			} else {
				otpFailCounts.set(record.id, fails);
			}
			throw new AppError(ErrorCode.AUTH_INVALID_OTP, 400);
		}
		otpFailCounts.delete(record.id);

		await prisma.token.update({ where: { id: record.id }, data: { isRevoked: true } });

		const hashed = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({ data: { email, password: hashed, name: email.split('@')[0] } });

		return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id), user.role), await this.generateRefreshToken(String(user.id)));
	}

	async login(email: string, password: string) {
		const user = await prisma.user.findFirst({
			where: { email, isDelete: false },
		});
		if (!user || !user.password) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);
		if (user.isDelete) throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);

		return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id), user.role), await this.generateRefreshToken(String(user.id)));
	}

	async logout(userId: string) {
		await prisma.token.updateMany({
			where: { userId: parseInt(userId), isRevoked: false, tokenType: TokenType.SESSION },
			data: { isRevoked: true },
		});
	}

	async refresh(token: string) {
		let payload: { userId: string };
		try {
			payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
		} catch {
			throw new AppError(ErrorCode.AUTH_INVALID_REFRESH_TOKEN, 401);
		}

		const existing = await prisma.token.findFirst({
			where: { refreshToken: token, isRevoked: false, tokenType: TokenType.SESSION },
		});
		if (!existing) throw new AppError(ErrorCode.AUTH_REFRESH_TOKEN_REVOKED, 401);

		const user = await prisma.user.findUnique({
			where: { id: parseInt(payload.userId) },
			select: { isDelete: true, role: true },
		});
		if (!user || user.isDelete) throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);

		return { accessToken: this.generateAccessToken(payload.userId, user.role) };
	}

	private generateAccessToken(userId: string, role: string) {
		return jwt.sign({ userId, role }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '1h' });
	}

	private async generateRefreshToken(userId: string) {
		await prisma.token.deleteMany({ where: { userId: parseInt(userId), tokenType: TokenType.SESSION } });

		const rt = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
		await prisma.token.create({
			data: {
				userId: parseInt(userId),
				refreshToken: rt,
				tokenType: TokenType.SESSION,
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			},
		});
		return rt;
	}
}
