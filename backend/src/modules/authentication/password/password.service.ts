import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode, AuthResponseDTO, AuthMapper } from '@echotrace/shared';
import { AuthRepository } from '../repositories/auth.repository.js';
import { generateAccessToken, generateRefreshToken } from '../shared/token-issuer.js';

export interface IPasswordService {
	login(email: string, password: string): Promise<AuthResponseDTO>;
}

@injectable()
export class PasswordService implements IPasswordService {
	constructor(@inject('AuthRepository') private authRepo: AuthRepository) {}

	async login(email: string, password: string) {
		const user = await this.authRepo.findActiveUserByEmailFull(email);
		if (!user || !user.password) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);
		if (user.isDelete) throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);

		return AuthMapper.toAuthResponse(user, generateAccessToken(String(user.id), user.role), await generateRefreshToken(this.authRepo, String(user.id)));
	}
}
