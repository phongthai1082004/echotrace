import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import type {ISessionService} from './sessions.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';

@injectable()
export class SessionController {
	constructor(@inject('ISessionService') private readonly sessionService: ISessionService) {}

	logout = async (req: AuthRequest, res: Response) => {
		if (!req.userId) throw new AppError(ErrorCode.AUTH_NOT_AUTHENTICATED, 401);
		await this.sessionService.logout(req.userId);
		res.json(ApiResponse.message('logged out'));
	};

	refresh = async (req: Request, res: Response) => {
		const { refreshToken } = req.body;
		if (!refreshToken) throw new AppError(ErrorCode.AUTH_REFRESH_TOKEN_REQUIRED, 400);
		const result = await this.sessionService.refresh(refreshToken);
		res.json(ApiResponse.success(result));
	};
}
