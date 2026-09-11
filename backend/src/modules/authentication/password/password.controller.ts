import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { IPasswordService } from './password.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class PasswordController {
	constructor(@inject('IPasswordService') private readonly passwordService: IPasswordService) {}

	login = async (req: Request, res: Response) => {
		const { email, password } = req.body;
		if (!email || !password) throw new AppError(ErrorCode.AUTH_EMAIL_PASSWORD_REQUIRED, 400);
		const result = await this.passwordService.login(email, password);
		res.json(ApiResponse.success(result));
	};
}
