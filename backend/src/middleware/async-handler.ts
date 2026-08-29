import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from './auth.middleware.js';

// ponytail: wrap async handler để Express bắt lỗi → errorMiddleware. Dùng chung thay vì định nghĩa lại mỗi route file.
export const asyncHandler = (
	fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => (req, res, next) => Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
