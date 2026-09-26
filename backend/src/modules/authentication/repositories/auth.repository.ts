import { injectable, inject } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { TokenType } from '@echotrace/shared';

// Service chỉ biết AuthRepository; không có $transaction ở feature này nên không cần tx?.
@injectable()
export class AuthRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	// --- user ---
	findUserByGoogleOrEmail(email: string, googleId: string) {
		return this.client.user.findFirst({
			where: { OR: [{ googleId }, { email }] },
			select: { id: true, email: true, name: true, avatar: true, role: true, isDelete: true },
		});
	}
	createGoogleUser(data: Prisma.UserUncheckedCreateInput) {
		return this.client.user.create({ data });
	}
	findActiveUserByEmail(email: string) {
		return this.client.user.findFirst({ where: { email, isDelete: false }, select: { id: true } });
	}
	findActiveUserByEmailFull(email: string) {
		return this.client.user.findFirst({ where: { email, isDelete: false } });
	}
	createPasswordUser(email: string, hashed: string) {
		return this.client.user.create({ data: { email, password: hashed, name: email.split('@')[0] } });
	}
	findUserByIdRole(id: number) {
		return this.client.user.findUnique({ where: { id }, select: { isDelete: true, role: true } });
	}

	// --- token (OTP / session) ---
	deleteOtpTokens(email: string) {
		return this.client.token.deleteMany({ where: { email, tokenType: TokenType.OTP } });
	}
	createOtpToken(email: string, hashed: string, expiresAt: Date) {
		return this.client.token.create({
			data: { email, refreshToken: hashed, tokenType: TokenType.OTP, expiresAt },
		});
	}
	// new one in a single transaction so a crash between the two ops cannot leave the user
	// with no valid OTP and no error surfaced.
	replaceOtpToken(email: string, hashed: string, expiresAt: Date) {
		return this.client.$transaction([
			this.client.token.deleteMany({ where: { email, tokenType: TokenType.OTP } }),
			this.client.token.create({
				data: { email, refreshToken: hashed, tokenType: TokenType.OTP, expiresAt },
			}),
		]);
	}
	findValidOtp(email: string) {
		return this.client.token.findFirst({ where: { email, tokenType: TokenType.OTP, isRevoked: false } });
	}
	revokeToken(id: number) {
		return this.client.token.update({ where: { id }, data: { isRevoked: true } });
	}
	revokeSessionTokens(userId: number) {
		return this.client.token.updateMany({
			where: { userId, isRevoked: false, tokenType: TokenType.SESSION },
			data: { isRevoked: true },
		});
	}
	findSessionByToken(token: string) {
		return this.client.token.findFirst({
			where: { refreshToken: token, isRevoked: false, tokenType: TokenType.SESSION },
		});
	}
	deleteSessionTokens(userId: number) {
		return this.client.token.deleteMany({ where: { userId, tokenType: TokenType.SESSION } });
	}
	createSessionToken(userId: number, rt: string, expiresAt: Date) {
		return this.client.token.create({
			data: { userId, refreshToken: rt, tokenType: TokenType.SESSION, expiresAt },
		});
	}
	// (by id) and creates the new one in a single $transaction.
	// Does NOT invalidate other device sessions (multi-device support).
	rotateSessionToken(oldTokenId: number, userId: number, newRt: string, expiresAt: Date) {
		return this.client.$transaction([
			this.client.token.delete({ where: { id: oldTokenId } }),
			this.client.token.create({
				data: { userId, refreshToken: newRt, tokenType: TokenType.SESSION, expiresAt },
			}),
		]);
	}
}
