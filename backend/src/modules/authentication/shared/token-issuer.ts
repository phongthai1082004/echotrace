import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { AuthRepository } from '../repositories/auth.repository.js';

export function generateAccessToken(userId: string, role: string) {
	return jwt.sign({ userId, role }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
}

export async function generateRefreshToken(authRepo: AuthRepository, userId: string) {
	const rt = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d', jwtid: randomUUID() });
	await authRepo.createSessionToken(parseInt(userId), rt, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
	return rt;
}
