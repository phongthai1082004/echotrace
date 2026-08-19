import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './app.error.js';
import { ErrorCode } from '@echotrace/shared';

export interface AuthRequest extends Request {
	userId?: string;
	userRole?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const header = req.headers.authorization;
		if (!header?.startsWith('Bearer ')) throw new AppError(ErrorCode.AUTH_MISSING_TOKEN, 401);

		const token = header.slice(7);
		const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string; role: string };

		req.userId = payload.userId;
		req.userRole = payload.role;
		next();
	} catch (error) {
		if (error instanceof AppError) return next(error);
		next(new AppError(ErrorCode.AUTH_TOKEN_EXPIRED, 401));
	}
};

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
	await authMiddleware(req, res, () => {
		if (req.userRole !== 'admin') return next(new AppError(ErrorCode.ADMIN_ACCESS_REQUIRED, 403));
		next();
	});
};
