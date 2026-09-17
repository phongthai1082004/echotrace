import { injectable, inject } from 'tsyringe';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { AuthRepository } from '../repositories/auth.repository.js';
import { generateAccessToken } from '../shared/token-issuer.js';

export interface ISessionService {
	logout(userId: string): Promise<void>;
	refresh(token: string): Promise<{ accessToken: string; refreshToken: string }>;
}

@injectable()
export class SessionService implements ISessionService {
	constructor(@inject('AuthRepository') private authRepo: AuthRepository) {}

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

		const accessToken = generateAccessToken(payload.userId, user.role);
		const rt = jwt.sign({ userId: payload.userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d', jwtid: randomUUID() });
		await this.authRepo.rotateSessionToken(
			existing.id,
			parseInt(payload.userId),
			rt,
			new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		);
		return { accessToken, refreshToken: rt };
	}
}
