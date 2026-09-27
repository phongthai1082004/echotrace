import { injectable, inject } from 'tsyringe';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode, AuthResponseDTO, AuthMapper } from '@echotrace/shared';
import { AuthRepository } from '../repositories/auth.repository.js';
import { generateAccessToken, generateRefreshToken } from '../shared/token-issuer.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface IOAuthService {
	loginWithGoogle(idToken: string): Promise<AuthResponseDTO>;
}

@injectable()
export class OAuthService implements IOAuthService {
	constructor(@inject('AuthRepository') private authRepo: AuthRepository) {}

	async loginWithGoogle(idToken: string) {
		let ticket;
		try {
			ticket = await googleClient.verifyIdToken({
				idToken,
				audience: process.env.GOOGLE_CLIENT_ID,
			});
		} catch {
			throw new AppError(ErrorCode.AUTH_INVALID_GOOGLE_TOKEN, 401);
		}
		const payload = ticket.getPayload();
		if (!payload?.email) throw new AppError(ErrorCode.AUTH_INVALID_GOOGLE_TOKEN, 401);
		if (payload.email_verified !== true) throw new AppError(ErrorCode.AUTH_INVALID_GOOGLE_TOKEN, 401);

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
		return AuthMapper.toAuthResponse(user, generateAccessToken(String(user.id), user.role), await generateRefreshToken(this.authRepo, String(user.id)));
	}
}
