import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { IOAuthService } from './oauth.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class OAuthController {
	constructor(@inject('IOAuthService') private readonly oauthService: IOAuthService) {}

	googleLogin = async (req: Request, res: Response) => {
		const { idToken } = req.body;
		if (!idToken) throw new AppError(ErrorCode.AUTH_ID_TOKEN_REQUIRED, 400);
		const result = await this.oauthService.loginWithGoogle(idToken);
		res.json(ApiResponse.success(result));
	};
}
